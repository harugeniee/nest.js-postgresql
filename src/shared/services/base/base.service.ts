import { HttpStatus } from '@nestjs/common';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { IPagination } from 'src/common/interface/pagination.interface';
import { ConditionBuilder } from 'src/shared/helpers/condition-builder';
import { PaginationFormatter } from 'src/shared/helpers/pagination-formatter';
import { BaseRepository } from 'src/shared/repositories/base.repository';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { decodeCursor, encodeCursor } from 'src/shared/utils/cursor.util';
import {
  mapTypeOrmError,
  notFound,
  throwI18n,
} from 'src/shared/utils/error.util';
import { DeepPartial, QueryRunner } from 'typeorm';

type I18nMaybe = { t: (k: string, a?: any) => string } | undefined;

export type QOpts<T> = {
  relations?: string[];
  select?: (keyof T)[];
  withDeleted?: boolean;
};

export type TxCtx = {
  queryRunner?: QueryRunner;
  i18n?: I18nMaybe;
  actorId?: string;
};

export abstract class BaseService<T extends { id: string }> {
  protected readonly idKey: keyof T;
  protected readonly softDeleteEnabled: boolean;
  protected readonly cacheOptions?: {
    enabled: boolean;
    ttlSec: number;
    prefix?: string;
    swrSec?: number;
  };

  constructor(
    protected readonly repo: BaseRepository<T>,
    protected readonly opts: {
      entityName: string;
      idKey?: string;
      softDelete?: boolean;
      relationsWhitelist?: string[];
      selectWhitelist?: (keyof T)[];
      cache?: {
        enabled: boolean;
        ttlSec: number;
        prefix?: string;
        swrSec?: number;
      };
      emitEvents?: boolean;
      defaultSearchField?: string;
    },
    protected readonly cacheService?: CacheService,
  ) {
    this.idKey = (opts.idKey as keyof T) || ('id' as keyof T);
    this.softDeleteEnabled =
      typeof opts.softDelete === 'boolean'
        ? opts.softDelete
        : repo.supportsSoftDelete();
    this.cacheOptions = opts.cache;
  }

  protected getSearchableColumns(): (keyof T)[] {
    return [];
  }
  protected async beforeCreate(_data: DeepPartial<T>): Promise<void> {
    return;
  }
  protected async afterCreate(_entity: T): Promise<void> {
    return;
  }
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<T>,
  ): Promise<void> {
    return;
  }
  protected async afterUpdate(_entity: T): Promise<void> {
    return;
  }
  protected async beforeDelete(_id: string): Promise<void> {
    return;
  }
  protected async afterDelete(_id: string): Promise<void> {
    return;
  }
  protected async onListQueryBuilt(_ctx: {
    where: any;
    order: any;
    dto: AdvancedPaginationDto | CursorPaginationDto;
  }): Promise<void> {}

  // Cache key helpers
  private byIdKey(id: string): string {
    const prefix = this.cacheOptions?.prefix || this.opts.entityName;
    return `${prefix}:id:${id}`;
  }
  private listKey(input: any): string {
    const prefix = this.cacheOptions?.prefix || this.opts.entityName;
    const crypto = require('crypto');
    const sha1 = crypto
      .createHash('sha1')
      .update(JSON.stringify(input))
      .digest('hex');
    return `${prefix}:list:${sha1}`;
  }
  private async invalidateCachesForId(id: string): Promise<void> {
    if (!this.cacheOptions?.enabled || !this.cacheService) return;
    try {
      await this.cacheService.delete(this.byIdKey(id));
      const prefix = this.cacheOptions?.prefix || this.opts.entityName;
      await this.cacheService.deleteKeysByPattern(`${prefix}:list:*`);
    } catch (e) {
      // Intentionally swallow cache errors to avoid failing the main operation
      // eslint-disable-next-line no-console
      console.warn('Cache invalidation failed', e);
    }
  }

  private applyWhitelists(qopts?: QOpts<T>) {
    if (!qopts) return {} as any;
    const { relations, select, withDeleted } = qopts;
    const ensured: any = {};
    if (relations) {
      if (
        this.opts.relationsWhitelist &&
        relations.some((r) => !this.opts.relationsWhitelist!.includes(r))
      ) {
        throwI18n(
          HttpStatus.BAD_REQUEST,
          'common.VALIDATION_ERROR',
          undefined,
          {
            field: 'relations',
            reason: 'not-allowed',
          },
        );
      }
      ensured.relations = relations;
    }
    if (select) {
      if (
        this.opts.selectWhitelist &&
        select.some((s) => !this.opts.selectWhitelist!.includes(s))
      ) {
        throwI18n(
          HttpStatus.BAD_REQUEST,
          'common.VALIDATION_ERROR',
          undefined,
          {
            field: 'select',
            reason: 'not-allowed',
          },
        );
      }
      ensured.select = select;
    }
    if (withDeleted !== undefined) ensured.withDeleted = withDeleted;
    return ensured;
  }

  private normalizeInput<TInput extends Record<string, any>>(
    input: TInput,
  ): TInput {
    const norm: any = {};
    for (const [k, v] of Object.entries(input || {})) {
      if (typeof v === 'string') {
        norm[k] = v.normalize('NFKC').trim();
      } else {
        norm[k] = v;
      }
    }
    return norm as TInput;
  }

  async create(data: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    try {
      await this.beforeCreate(data);
      const entity = this.repo.create(data);
      const saved = await this.repo.save(entity, {
        queryRunner: ctx?.queryRunner,
      });
      await this.afterCreate(saved);
      const savedRecord = saved as unknown as Record<string, unknown>;
      const key = String(this.idKey);
      const savedId = String(savedRecord[key]);
      await this.invalidateCachesForId(savedId);
      return saved;
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async findById(id: string, opts?: QOpts<T>, ctx?: TxCtx): Promise<T> {
    const cacheKey = this.byIdKey(id);
    if (this.cacheOptions?.enabled && this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached as T;
    }

    const entity = await this.repo.findById(id, {
      ...(opts || {}),
    });
    if (!entity) {
      return notFound(this.opts.entityName, id, ctx?.i18n);
    }
    if (this.cacheOptions?.enabled && this.cacheService) {
      await this.cacheService.set(cacheKey, entity, this.cacheOptions.ttlSec);
    }
    return entity;
  }

  async findOne(where: any, opts?: QOpts<T>, _ctx?: TxCtx): Promise<T | null> {
    try {
      return await this.repo.findOne(where, { ...(opts || {}) });
    } catch (e: any) {
      return mapTypeOrmError(e, _ctx?.i18n);
    }
  }

  async listOffset(
    pagination: AdvancedPaginationDto,
    extra?: Record<string, any>,
    qopts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<IPagination<T>> {
    const { page, limit, sortBy, order, ...rest } = pagination;
    const restNormalized = this.normalizeInput(rest as any);
    const where = ConditionBuilder.build(
      { ...restNormalized, ...(extra || {}) },
      this.opts.defaultSearchField || 'name',
    );
    const orderObj: any = { [sortBy]: order };
    await this.onListQueryBuilt({ where, order: orderObj, dto: pagination });

    const cacheKey = this.cacheOptions?.enabled
      ? this.listKey({ where, page, limit, sortBy, order })
      : undefined;
    if (cacheKey && this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached as IPagination<T>;
    }

    try {
      const [data, total] = await this.repo.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
        order: orderObj,
        where,
        ...this.applyWhitelists(qopts),
      });
      const result = PaginationFormatter.offset(data, total, page, limit);
      if (cacheKey && this.cacheService) {
        await this.cacheService.set(
          cacheKey,
          result,
          this.cacheOptions!.ttlSec,
        );
      }
      return result;
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async listCursor(
    pagination: CursorPaginationDto & Partial<AdvancedPaginationDto>,
    extra?: Record<string, any>,
    qopts?: QOpts<T>,
    ctx?: TxCtx,
  ): Promise<{
    data: T[];
    nextCursor?: string;
    prevCursor?: string;
    take: number;
    sortBy: string;
    order: 'ASC' | 'DESC';
  }> {
    const take = pagination.limit;
    const sortBy = pagination.sortBy;
    const order = pagination.order;
    const { cursor, ...rest } = pagination;
    const restNormalized = this.normalizeInput(rest as any);
    const where = ConditionBuilder.build(
      { ...restNormalized, ...(extra || {}) },
      this.opts.defaultSearchField || 'name',
    );
    const decoded = decodeCursor(cursor, ctx?.i18n);
    const windowOrder: any = { [sortBy]: order, [this.idKey as string]: order };

    // Apply window
    if (decoded?.v !== undefined) {
      const op = order === 'ASC' ? 'MoreThan' : 'LessThan';
      const typeorm = require('typeorm');
      const comparator = typeorm[op];
      const orWhere = [
        { ...(where as any), [sortBy]: comparator(decoded.v) },
        {
          ...(where as any),
          [sortBy]: decoded.v,
          [this.idKey as string]: comparator(decoded.v2 ?? '0'),
        },
      ];
      // override where to be OR of window conditions
      (where as any) = orWhere;
    }

    await this.onListQueryBuilt({ where, order: windowOrder, dto: pagination });

    try {
      const [data] = await this.repo.findAndCount({
        where,
        order: windowOrder,
        take: take,
        ...this.applyWhitelists(qopts),
      });
      const next = data.length > 0 ? (data[data.length - 1] as any) : undefined;
      const prev = data.length > 0 ? (data[0] as any) : undefined;
      const nextCursor = next
        ? encodeCursor(sortBy, order, next[sortBy])
        : undefined;
      const prevCursor = prev
        ? encodeCursor(sortBy, order, prev[sortBy])
        : undefined;
      return { data, nextCursor, prevCursor, take, sortBy, order };
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async update(id: string, patch: DeepPartial<T>, ctx?: TxCtx): Promise<T> {
    try {
      await this.beforeUpdate(id, patch);
      await this.repo.updateById(id, patch as any, {
        queryRunner: ctx?.queryRunner,
      });
      const updated = await this.findById(id, undefined, ctx);
      await this.afterUpdate(updated);
      await this.invalidateCachesForId(id);
      return updated;
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async remove(id: string, ctx?: TxCtx): Promise<void> {
    try {
      await this.beforeDelete(id);
      await this.repo.deleteById(id, { queryRunner: ctx?.queryRunner });
      await this.afterDelete(id);
      await this.invalidateCachesForId(id);
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async softDelete(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.beforeDelete(id);
      await this.repo.softDeleteById(id, { queryRunner: ctx?.queryRunner });
      await this.afterDelete(id);
      await this.invalidateCachesForId(id);
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async restore(id: string, ctx?: TxCtx): Promise<void> {
    if (!this.softDeleteEnabled) return;
    try {
      await this.repo.restoreById(id, { queryRunner: ctx?.queryRunner });
      await this.invalidateCachesForId(id);
    } catch (e: any) {
      return mapTypeOrmError(e, ctx?.i18n);
    }
  }

  async runInTransaction<R>(fn: (qr: QueryRunner) => Promise<R>): Promise<R> {
    return this.repo.withTransaction<R>(async (qr) => {
      return await fn(qr);
    });
  }
}
