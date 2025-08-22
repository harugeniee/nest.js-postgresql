import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { BaseRepository } from 'src/common/repositories/base.repository';
import {
  applyWhitelist,
  decodeSignedCursor,
  encodeSignedCursor,
  mapTypeOrmError,
  normalizeSearchInput,
  notFound,
  sha1Hex,
  stableStringify,
} from 'src/common/utils';
import { ConditionBuilder, PaginationFormatter } from 'src/shared/helpers';
import { CacheOptions, CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsWhere,
  LessThan,
  MoreThan,
  QueryRunner,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { Injectable, Optional } from '@nestjs/common';

export type QOpts<T> = {
  relations?: string[] | FindOptionsRelations<T>;
  select?: (keyof T)[];
  withDeleted?: boolean;
};

export type TxCtx = { queryRunner?: QueryRunner };

@Injectable()
export abstract class BaseService<T extends { id: string }> {
  protected readonly idKey: keyof T;
  protected readonly softDeleteEnabled: boolean;
  protected readonly defaultSearchField: string;
  protected readonly cache?: CacheOptions & { prefix: string };
  protected readonly entityName: string;

  constructor(
    protected readonly repo: BaseRepository<T>,
    protected readonly opts: {
      entityName: string;
      idKey?: string;
      softDelete?: boolean;
      relationsWhitelist?: string[];
      selectWhitelist?: (keyof T)[];
      cache?: CacheOptions & { prefix?: string };
      emitEvents?: boolean;
      defaultSearchField?: string;
    },
    @Optional() protected readonly cacheService?: CacheService,
    @Optional()
    protected readonly eventEmitter?: {
      emit?: (event: string, payload: unknown) => unknown;
    },
  ) {
    this.entityName = opts.entityName;
    this.idKey = (opts.idKey || 'id') as keyof T;
    this.softDeleteEnabled =
      typeof opts.softDelete === 'boolean'
        ? opts.softDelete
        : repo.supportsSoftDelete();
    this.defaultSearchField = opts.defaultSearchField || 'name';
    if (opts.cache?.enabled) {
      const prefix = opts.cache.prefix || opts.entityName;
      this.cache = { ...opts.cache, prefix } as CacheOptions & {
        prefix: string;
      };
    }
  }

  // Hooks for child services to override
  protected getSearchableColumns(): (keyof T)[] {
    return [];
  }

  protected async beforeCreate(data: DeepPartial<T>): Promise<DeepPartial<T>> {
    return data;
  }

  protected async afterCreate(entity: T): Promise<void> {
    return;
  }

  protected async beforeUpdate(
    id: string,
    patch: DeepPartial<T>,
  ): Promise<void> {
    return;
  }

  protected async afterUpdate(entity: T): Promise<void> {
    return;
  }

  protected async beforeDelete(id: string): Promise<void> {
    return;
  }

  protected async afterDelete(id: string): Promise<void> {
    return;
  }

  protected async onListQueryBuilt(_ctx: {
    where: unknown;
    order: unknown;
    dto: AdvancedPaginationDto | CursorPaginationDto;
  }): Promise<void> {
    return;
  }

  async create(data: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    try {
      const prepared = await this.beforeCreate(data);
      const entity = this.repo.create(prepared);
      const saved = await this.repo.save(entity, ctx);
      await this.afterCreate(saved);
      await this.invalidateCacheForEntity(saved.id);
      this.emitEvent(`${this.entityName}.created`, { after: saved });
      return saved;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Create multiple entities in batch
   * @param data Array of data objects to create entities from
   * @param ctx Transaction context
   * @returns Array of created entities
   */
  async createMany(data: DeepPartial<T>[], ctx?: TxCtx): Promise<T[]> {
    try {
      const preparedData: DeepPartial<T>[] = [];

      // Prepare all data using beforeCreate hook
      for (const item of data) {
        const prepared = await this.beforeCreate(item);
        preparedData.push(prepared);
      }

      // Create entities one by one since repo.create expects single entity
      const entities: T[] = [];
      for (const item of preparedData) {
        const entity = this.repo.create(item);
        entities.push(entity);
      }

      const saved = await this.repo.saveMany(entities, ctx);

      // Execute afterCreate hook for each entity
      for (const entity of saved) {
        await this.afterCreate(entity);
        await this.invalidateCacheForEntity(entity.id);
        this.emitEvent(`${this.entityName}.created`, { after: entity });
      }

      return saved;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async findById(id: string, opts?: QOpts<T>, ctx?: TxCtx): Promise<T> {
    const safe = this.applyQueryOpts(opts);
    const cacheKey = this.cache ? `${this.cache.prefix}:id:${id}` : undefined;
    if (cacheKey) {
      const cached = (await this.cacheService?.get(cacheKey)) as T | null;
      if (cached) return cached;
    }
    const found = await this.repo.findById(id, safe);
    if (!found) notFound(this.entityName, id);
    if (cacheKey && found && this.cache) {
      await this.cacheService?.set(cacheKey, found, this.cache.ttlSec);
    }
    return found;
  }

  async findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<T | null> {
    const safe = this.applyQueryOpts(opts);
    return await this.repo.findOne(where, safe);
  }

  async listOffset(
    pagination: AdvancedPaginationDto,
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<IPagination<T>> {
    const { page, limit, sortBy, order, ...rest } = pagination;
    if (rest.query) rest.query = normalizeSearchInput(rest.query);
    const where = ConditionBuilder.build(
      { ...rest, ...(extraFilter || {}) },
      this.defaultSearchField,
    );
    const safe = this.applyQueryOpts(opts);
    const orderObj: FindOptionsOrder<T> = {};
    (orderObj as Record<string, 'ASC' | 'DESC'>)[sortBy] = order;
    (orderObj as Record<string, 'ASC' | 'DESC'>)[String(this.idKey)] = order;
    await this.onListQueryBuilt({ where, order: orderObj, dto: pagination });
    console.log('where', where);
    const cacheKey = this.cache
      ? `${this.cache.prefix}:list:${sha1Hex(
          stableStringify({
            where,
            page,
            limit,
            sortBy,
            order,
            select: safe.select,
            relations: safe.relations,
          }),
        )}`
      : undefined;

    if (cacheKey) {
      const cached = (await this.cacheService?.get(
        cacheKey,
      )) as IPagination<T> | null;
      if (cached) {
        // Optional SWR: if ttl is within swr window, refresh in background
        const cacheSvc = this.cacheService;
        if (this.cache?.swrSec && cacheSvc) {
          void (async () => {
            const ttl = await cacheSvc.getTtl(cacheKey);
            if (
              this.cache &&
              this.cache.swrSec &&
              ttl >= 0 &&
              ttl <= this.cache.swrSec
            ) {
              const [freshData, freshTotal] = await this.repo.findAndCount({
                skip: (page - 1) * limit,
                take: limit,
                order: orderObj,
                where,
                relations: safe.relations,
                select: safe.select,
                withDeleted: safe.withDeleted,
              });
              const freshEnvelope = PaginationFormatter.offset<T>(
                freshData,
                freshTotal,
                page,
                limit,
              );
              if (this.cache) {
                await this.cacheService?.set(
                  cacheKey,
                  freshEnvelope,
                  this.cache.ttlSec,
                );
              }
            }
          })();
        }
        return cached;
      }
    }

    const [data, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: orderObj,
      where,
      relations: safe.relations,
      select: safe.select,
      withDeleted: safe.withDeleted,
    });

    const envelope = PaginationFormatter.offset<T>(data, total, page, limit);
    if (cacheKey && this.cache) {
      await this.cacheService?.set(cacheKey, envelope, this.cache.ttlSec);
    }
    return envelope;
  }

  async listCursor(
    pagination: CursorPaginationDto & Partial<AdvancedPaginationDto>,
    extraFilter?: Record<string, unknown>,
    opts?: QOpts<T>,
    _ctx?: TxCtx,
  ): Promise<IPaginationCursor<T>> {
    const {
      limit,
      sortBy = 'createdAt',
      order = 'DESC',
      cursor,
      ...rest
    } = pagination;
    const restAdv: Partial<AdvancedPaginationDto> =
      rest as Partial<AdvancedPaginationDto>;
    if (typeof restAdv.query === 'string') {
      restAdv.query = normalizeSearchInput(restAdv.query);
    }
    const baseFilter: Record<string, unknown> = restAdv;
    if (extraFilter) {
      Object.assign(baseFilter, extraFilter);
    }
    const where = ConditionBuilder.build(baseFilter, this.defaultSearchField);
    const safe = this.applyQueryOpts(opts);
    const token = decodeSignedCursor(cursor);
    const take = limit;

    // Apply cursor boundary: (sortBy, id) tuple for stable ordering
    const boundary = token?.value;
    const direction: 'ASC' | 'DESC' = token?.order || order;

    const orderObj: FindOptionsOrder<T> = {};
    (orderObj as Record<string, 'ASC' | 'DESC'>)[sortBy] = direction;
    (orderObj as Record<string, 'ASC' | 'DESC'>)[String(this.idKey)] =
      direction;
    await this.onListQueryBuilt({ where, order: orderObj, dto: pagination });

    const whereToUse: FindOptionsWhere<T> | FindOptionsWhere<T>[] =
      this.buildCursorBoundaryWhere(
        where as FindOptionsWhere<T>,
        sortBy,
        String(this.idKey),
        direction,
        boundary,
      );

    const [data] = await this.repo.findAndCount({
      where: whereToUse,
      order: orderObj,
      take,
      relations: safe.relations,
      select: safe.select,
      withDeleted: safe.withDeleted,
    });

    const last = data.length > 0 ? data[data.length - 1] : undefined;
    const lastRecord = last;
    const nextCursor = lastRecord
      ? encodeSignedCursor({
          key: sortBy,
          order: direction,
          value: {
            [sortBy]: lastRecord?.[sortBy] as unknown,
            [String(this.idKey)]: lastRecord?.[String(this.idKey)] as unknown,
          },
        })
      : undefined;

    return {
      result: data,
      metaData: {
        nextCursor,
        prevCursor: undefined,
        take,
        sortBy,
        order: direction,
      },
    };
  }

  private buildCursorBoundaryWhere(
    where: FindOptionsWhere<T>,
    sortBy: string,
    idKey: string,
    direction: 'ASC' | 'DESC',
    boundary?: Record<string, unknown>,
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (
      !boundary ||
      !Object.hasOwn(boundary, sortBy) ||
      !Object.hasOwn(boundary, idKey)
    ) {
      return where;
    }

    const primaryVal = boundary[sortBy];
    const idVal = boundary[idKey];
    const cmp = (dir: 'ASC' | 'DESC', val: unknown) =>
      dir === 'ASC' ? MoreThan(val) : LessThan(val);

    const orConditions: Record<string, unknown>[] = [
      {
        ...where,
        [sortBy]: cmp(direction, primaryVal),
      },
      {
        ...where,
        [sortBy]: primaryVal,
        [idKey]: cmp(direction, idVal),
      },
    ];

    return orConditions as unknown as FindOptionsWhere<T>[];
  }

  async update(id: string, patch: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    try {
      await this.beforeUpdate(id, patch);
      await this.repo.updateById(id, patch as QueryDeepPartialEntity<T>, ctx);
      const updated = await this.repo.findById(id);
      if (!updated) notFound(this.entityName, id);
      await this.afterUpdate(updated);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.updated`, { after: updated });
      return updated;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Update multiple entities in batch
   * @param updates Array of objects containing id and patch data
   * @param ctx Transaction context
   * @returns Array of updated entities
   */
  async updateMany(
    updates: Array<{ id: string; patch: DeepPartial<T> }>,
    ctx?: TxCtx,
  ): Promise<T[]> {
    try {
      const updatedEntities: T[] = [];

      // Execute beforeUpdate hook for each update
      for (const { id, patch } of updates) {
        await this.beforeUpdate(id, patch);
      }

      // Perform all updates
      for (const { id, patch } of updates) {
        await this.repo.updateById(id, patch as QueryDeepPartialEntity<T>, ctx);
      }

      // Fetch updated entities and execute afterUpdate hooks
      for (const { id } of updates) {
        const updated = await this.repo.findById(id);
        if (!updated) notFound(this.entityName, id);
        await this.afterUpdate(updated);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.updated`, { after: updated });
        updatedEntities.push(updated);
      }

      return updatedEntities;
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async remove(id: string, ctx?: TxCtx): Promise<void> {
    try {
      await this.beforeDelete(id);
      await this.repo.deleteById(id, ctx);
      await this.afterDelete(id);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Remove multiple entities in batch
   * @param ids Array of entity IDs to remove
   * @param ctx Transaction context
   */
  async removeMany(ids: string[], ctx?: TxCtx): Promise<void> {
    try {
      // Execute beforeDelete hook for each entity
      for (const id of ids) {
        await this.beforeDelete(id);
      }

      // Perform all deletions
      for (const id of ids) {
        await this.repo.deleteById(id, ctx);
      }

      // Execute afterDelete hook and cache invalidation for each entity
      for (const id of ids) {
        await this.afterDelete(id);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
      }
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async softDelete(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.beforeDelete(id);
      await this.repo.softDeleteById(id, ctx);
      await this.afterDelete(id);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  /**
   * Soft delete multiple entities in batch
   * @param ids Array of entity IDs to soft delete
   * @param ctx Transaction context
   */
  async softDeleteMany(ids: string[], ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      // Execute beforeDelete hook for each entity
      for (const id of ids) {
        await this.beforeDelete(id);
      }

      // Perform all soft deletions
      for (const id of ids) {
        await this.repo.softDeleteById(id, ctx);
      }

      // Execute afterDelete hook and cache invalidation for each entity
      for (const id of ids) {
        await this.afterDelete(id);
        await this.invalidateCacheForEntity(id);
        this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
      }
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async restore(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.repo.restoreById(id, ctx);
      await this.invalidateCacheForEntity(id);
      this.emitEvent(`${this.entityName}.restored`, { after: { id } });
    } catch (error) {
      mapTypeOrmError(error);
    }
  }

  async runInTransaction<R>(fn: (qr: QueryRunner) => Promise<R>): Promise<R> {
    return this.repo.withTransaction<R>(fn);
  }

  protected applyQueryOpts(opts?: QOpts<T>): QOpts<T> {
    const relations = Array.isArray(opts?.relations)
      ? applyWhitelist(opts?.relations, this.opts.relationsWhitelist)
      : opts?.relations;
    let select = opts?.select;
    if (this.opts.selectWhitelist && select) {
      const whitelist = this.opts.selectWhitelist;
      select = select.filter((k) => whitelist.includes(k));
    }
    const withDeleted = opts?.withDeleted ?? false;
    return {
      relations: relations || undefined,
      select,
      withDeleted,
    };
  }

  protected async invalidateCacheForEntity(id: string): Promise<void> {
    if (!this.cache) return;
    await this.cacheService?.delete(`${this.cache.prefix}:id:${id}`);
    await this.cacheService?.deleteKeysByPattern(`${this.cache.prefix}:list:*`);
  }

  protected emitEvent(event: string, payload: unknown): void {
    if (!this.opts.emitEvents) return;
    try {
      this.eventEmitter?.emit?.(event, payload);
    } catch {
      // Ignore emitter errors to avoid impacting main flow
    }
  }
}
