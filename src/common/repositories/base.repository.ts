import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  QueryRunner,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export interface BaseRepositoryFindByIdOpts<T> {
  relations?: string[] | FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  withDeleted?: boolean;
}

export interface BaseRepositoryFindAndCountOpts<T> {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  order?: FindOptionsOrder<T>;
  relations?: string[] | FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  skip?: number;
  take?: number;
  withDeleted?: boolean;
}

export interface BaseRepository<T> {
  create(data: DeepPartial<T>): T;
  save(entity: T, ctx?: { queryRunner?: QueryRunner }): Promise<T>;
  saveMany(entities: T[], ctx?: { queryRunner?: QueryRunner }): Promise<T[]>;
  findById(id: string, opts?: BaseRepositoryFindByIdOpts<T>): Promise<T | null>;
  findOne(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    opts?: {
      relations?: string[] | FindOptionsRelations<T>;
      select?: FindOptionsSelect<T>;
    },
  ): Promise<T | null>;
  findAndCount(opts: BaseRepositoryFindAndCountOpts<T>): Promise<[T[], number]>;
  updateById(
    id: string,
    patch: QueryDeepPartialEntity<T>,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void>;
  deleteById(id: string, ctx?: { queryRunner?: QueryRunner }): Promise<void>;
  softDeleteById(
    id: string,
    ctx?: { queryRunner?: QueryRunner },
  ): Promise<void>;
  restoreById(id: string, ctx?: { queryRunner?: QueryRunner }): Promise<void>;
  withTransaction<R>(cb: (qr: QueryRunner) => Promise<R>): Promise<R>;
  supportsSoftDelete(): boolean;
}
