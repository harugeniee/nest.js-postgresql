import {
  BaseRepository,
  BaseRepositoryFindAndCountOpts,
  BaseRepositoryFindByIdOpts,
} from 'src/common/repositories/base.repository';
import {
  DeepPartial,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  QueryRunner,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class TypeOrmBaseRepository<T extends { id: string }>
  implements BaseRepository<T>
{
  constructor(private readonly repo: Repository<T>) {}

  create(data: DeepPartial<T>): T {
    return this.repo.create(data);
  }

  async save(entity: T, ctx?: { queryRunner?: QueryRunner }): Promise<T> {
    if (ctx?.queryRunner) {
      return await ctx.queryRunner.manager.save(entity);
    }
    return await this.repo.save(entity);
  }

  async saveMany(
    entities: T[],
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<T[]> {
    if (ctx?.queryRunner) {
      return await ctx.queryRunner.manager.save(entities);
    }
    return await this.repo.save(entities);
  }

  async findById(
    id: string,
    opts?: BaseRepositoryFindByIdOpts<T>,
  ): Promise<T | null> {
    const { relations, select, withDeleted } = opts || {};
    return await this.repo.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations,
      select,
      withDeleted,
    });
  }

  async findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: {
      relations?: string[] | FindOptionsRelations<T>;
      select?: FindOptionsSelect<T>;
    },
  ): Promise<T | null> {
    const { relations, select } = opts || {};
    return await this.repo.findOne({
      where,
      relations,
      select,
    });
  }

  async findAndCount(
    opts: BaseRepositoryFindAndCountOpts<T>,
  ): Promise<[T[], number]> {
    const { where, order, relations, select, skip, take, withDeleted } = opts;
    return await this.repo.findAndCount({
      where,
      order,
      relations,
      select,
      skip,
      take,
      withDeleted,
    });
  }

  async updateById(
    id: string,
    patch: QueryDeepPartialEntity<T>,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void> {
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.update(this.repo.target, id, patch);
      return;
    }
    await this.repo.update(id, patch);
  }

  async deleteById(
    id: string,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void> {
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.delete(this.repo.target, id);
      return;
    }
    await this.repo.delete(id);
  }

  async softDeleteById(
    id: string,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void> {
    if (!this.supportsSoftDelete()) {
      // Fall back to hard delete if soft delete not supported
      await this.deleteById(id, ctx);
      return;
    }
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.softDelete(this.repo.target, id);
      return;
    }
    await this.repo.softDelete(id);
  }

  async restoreById(
    id: string,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void> {
    if (!this.supportsSoftDelete()) return;
    if (ctx?.queryRunner) {
      await ctx.queryRunner.manager.restore(this.repo.target, id);
      return;
    }
    await this.repo.restore(id);
  }

  async withTransaction<R>(cb: (qr: QueryRunner) => Promise<R>): Promise<R> {
    const queryRunner = this.repo.manager.connection.createQueryRunner();
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
    // Heuristic: entities with DeleteDateColumn support soft delete
    // TypeORM repository has metadata with columns
    return this.repo.metadata.columns.some(
      (c) => c.propertyName === 'deletedAt',
    );
  }
}
