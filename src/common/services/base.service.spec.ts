import { AdvancedPaginationDto } from 'src/common/dto';
import { PaginationFormatter } from 'src/shared/helpers/pagination-formatter';
import { QueryRunner } from 'typeorm';

import {
  BaseRepository,
  BaseRepositoryFindAndCountOpts,
  BaseRepositoryFindByIdOpts,
} from '../repositories/base.repository';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseService } from './base.service';

class DummyEntity {
  id!: string;
  createdAt!: Date;
  name!: string;
  status!: string;
}

class InMemoryRepo implements BaseRepository<DummyEntity> {
  private store: DummyEntity[] = [];

  constructor(seed: DummyEntity[] = []) {
    this.store = seed;
  }

  create(data: Partial<DummyEntity>): DummyEntity {
    return {
      id: (Math.random() * 1e6).toFixed(0),
      createdAt: new Date(),
      name: '',
      status: 'ACTIVE',
      ...data,
    } as DummyEntity;
  }
  async save(entity: DummyEntity): Promise<DummyEntity> {
    const idx = this.store.findIndex(e => e.id === entity.id);
    if (idx >= 0) this.store[idx] = entity;
    else this.store.push(entity);
    return entity;
  }
  async findById(
    id: string,
    _opts?: BaseRepositoryFindByIdOpts<DummyEntity>,
  ): Promise<DummyEntity | null> {
    return this.store.find(e => e.id === id) || null;
  }
  async findOne(where: any): Promise<DummyEntity | null> {
    if (Array.isArray(where)) {
      for (const w of where) {
        const found = this.matchWhere(w);
        if (found) return found;
      }
      return null;
    }
    return this.matchWhere(where);
  }
  private matchWhere(where: any): DummyEntity | null {
    return (
      this.store.find(e =>
        Object.entries(where).every(([k, v]) => (e as unknown as any)[k] === v),
      ) || null
    );
  }
  async findAndCount(
    opts: BaseRepositoryFindAndCountOpts<DummyEntity>,
  ): Promise<[DummyEntity[], number]> {
    const { skip = 0, take = 10, order } = opts;
    let result = [...this.store];
    if (order) {
      const rec = order as Record<string, 'ASC' | 'DESC'>;
      const keys = Object.keys(rec);
      if (keys.length > 0) {
        const k = keys[0] as keyof DummyEntity;
        const dir = rec[keys[0]];
        result.sort((a, b) => {
          const av = a[k] as unknown as number | string | Date;
          const bv = b[k] as unknown as number | string | Date;
          if (av < bv) return dir === 'ASC' ? -1 : 1;
          if (av > bv) return dir === 'ASC' ? 1 : -1;
          return 0;
        });
      }
    }
    const total = result.length;
    result = result.slice(skip, skip + take);
    return [result, total];
  }
  async updateById(_id: string): Promise<void> {
    return;
  }
  async deleteById(id: string): Promise<void> {
    this.store = this.store.filter(e => e.id !== id);
  }
  async softDeleteById(id: string): Promise<void> {
    await this.deleteById(id);
  }
  async restoreById(_id: string): Promise<void> {
    return;
  }
  async withTransaction<R>(cb: (qr: QueryRunner) => Promise<R>): Promise<R> {
    return cb({} as QueryRunner);
  }
  supportsSoftDelete(): boolean {
    return false;
  }
}

class DummyService extends BaseService<DummyEntity> {}

describe('BaseService', () => {
  it('listOffset returns PaginationFormatter.offset envelope', async () => {
    const seed: DummyEntity[] = [
      {
        id: '1',
        createdAt: new Date('2020-01-01'),
        name: 'a',
        status: 'ACTIVE',
      },
      {
        id: '2',
        createdAt: new Date('2020-01-02'),
        name: 'b',
        status: 'ACTIVE',
      },
    ];
    const repo = new InMemoryRepo(seed);
    const service = new DummyService(repo, { entityName: 'Dummy' } as any);
    const dto = Object.assign(new AdvancedPaginationDto(), {
      page: 1,
      limit: 1,
      sortBy: 'createdAt',
      order: 'ASC',
    });
    const page = await service.listOffset(dto);
    const expected = PaginationFormatter.offset([seed[0]], 2, 1, 1);
    expect(page).toEqual(expected);
  });
});
