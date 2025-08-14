import {
  DataSource,
  DeepPartial,
  FindManyOptions,
  FindOptionsSelect,
  FindOptionsWhere,
  QueryRunner,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  BaseRepository,
  FindAndCountOptions,
  FindByIdOptions,
  FindOneOptions,
  RepositorySaveContext,
  getEntitySoftDeleteSupport,
} from './base.repository';

export class TypeormBaseRepository<T extends { id: string }>
  implements BaseRepository<T>
{
  constructor(
    private readonly dataSource: DataSource,
    private readonly repository: Repository<T>,
    private readonly entityClass: new () => T,
  ) {}

  create(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  async save(entity: T, ctx?: RepositorySaveContext): Promise<T> {
    if (ctx?.queryRunner) {
      return await ctx.queryRunner.manager.save(this.entityClass, entity);
    }
    return await this.repository.save(entity);
  }

  async findById(id: string, opts?: FindByIdOptions<T>): Promise<T | null> {
    const where: FindOptionsWhere<T> = { id } as any;
    return await this.repository.findOne({
      where,
      relations: opts?.relations,
      select: (opts?.select as FindOptionsSelect<T>) || undefined,
      withDeleted: opts?.withDeleted,
    });
  }

  async findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: FindOneOptions<T>,
  ): Promise<T | null> {
    return await this.repository.findOne({
      where,
      relations: opts?.relations,
      select: (opts?.select as FindOptionsSelect<T>) || undefined,
    });
  }

  async findAndCount(opts: FindAndCountOptions<T>): Promise<[T[], number]> {
    const options: FindManyOptions<T> = {
      where: opts.where,
      order: opts.order,
      relations: opts.relations,
      select: (opts.select as any) || undefined,
      skip: opts.skip,
      take: opts.take,
      withDeleted: opts.withDeleted,
    };
    return await this.repository.findAndCount(options);
  }

  async updateById(
    id: string,
    patch: QueryDeepPartialEntity<T>,
    ctx?: RepositorySaveContext,
  ): Promise<void> {
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.update<T>(
        this.entityClass,
        { id } as any,
        patch,
      );
      return;
    }
    await this.repository.update({ id } as any, patch);
  }

  async deleteById(id: string, ctx?: RepositorySaveContext): Promise<void> {
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.delete<T>(this.entityClass, { id } as any);
      return;
    }
    await this.repository.delete({ id } as any);
  }

  async softDeleteById(id: string, ctx?: RepositorySaveContext): Promise<void> {
    if (!this.supportsSoftDelete()) {
      // fallback to hard delete if soft delete unsupported
      await this.deleteById(id, ctx);
      return;
    }
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.softDelete<T>(this.entityClass, {
        id,
      } as any);
      return;
    }
    await this.repository.softDelete({ id } as any);
  }

  async restoreById(id: string, ctx?: RepositorySaveContext): Promise<void> {
    if (!this.supportsSoftDelete()) return; // no-op if unsupported
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.restore<T>(this.entityClass, { id } as any);
      return;
    }
    await this.repository.restore({ id } as any);
  }

  async withTransaction<R>(cb: (qr: QueryRunner) => Promise<R>): Promise<R> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await cb(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  supportsSoftDelete(): boolean {
    return getEntitySoftDeleteSupport(this.entityClass);
  }
}
