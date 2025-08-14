import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsSelect,
  FindOptionsWhere,
  QueryRunner,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export type RepositorySaveContext = { queryRunner?: QueryRunner };

export interface FindByIdOptions<T> {
  relations?: string[];
  select?: (keyof T)[];
  withDeleted?: boolean;
}

export interface FindOneOptions<T> {
  relations?: string[];
  select?: (keyof T)[];
}

export interface FindAndCountOptions<T> {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  order?: FindOptionsOrder<T>;
  relations?: string[];
  select?: FindOptionsSelect<T>;
  skip?: number;
  take?: number;
  withDeleted?: boolean;
}

export interface BaseRepository<T extends { id: string }> {
  create(data: DeepPartial<T>): T;
  save(entity: T, ctx?: RepositorySaveContext): Promise<T>;
  findById(id: string, opts?: FindByIdOptions<T>): Promise<T | null>;
  findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: FindOneOptions<T>,
  ): Promise<T | null>;
  findAndCount(opts: FindAndCountOptions<T>): Promise<[T[], number]>;
  updateById(
    id: string,
    patch: QueryDeepPartialEntity<T>,
    ctx?: RepositorySaveContext,
  ): Promise<void>;
  deleteById(id: string, ctx?: RepositorySaveContext): Promise<void>;
  softDeleteById(id: string, ctx?: RepositorySaveContext): Promise<void>;
  restoreById(id: string, ctx?: RepositorySaveContext): Promise<void>;
  withTransaction<R>(cb: (qr: QueryRunner) => Promise<R>): Promise<R>;
  supportsSoftDelete(): boolean;
}

export const getEntitySoftDeleteSupport = (entity: any): boolean => {
  // Heuristic: entities extending BaseEntityCustom include a DeleteDateColumn `deletedAt`
  // We check for property metadata existence at runtime by name
  return 'deletedAt' in (entity?.prototype ?? {});
};
