import { AdvancedPaginationDto } from 'src/common/dto';
import { PaginationFormatter } from 'src/shared/helpers/pagination-formatter';
import { QueryRunner } from 'typeorm';

import {
  BaseRepository,
  BaseRepositoryFindAndCountOpts,
  BaseRepositoryFindByIdOpts,
} from '../repositories/base.repository';

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
    const idx = this.store.findIndex((e) => e.id === entity.id);
    if (idx >= 0) this.store[idx] = entity;
    else this.store.push(entity);
    return entity;
  }

  async saveMany(entities: DummyEntity[]): Promise<DummyEntity[]> {
    const saved: DummyEntity[] = [];
    for (const entity of entities) {
      const savedEntity = await this.save(entity);
      saved.push(savedEntity);
    }
    return saved;
  }

  async findById(
    id: string,
    _opts?: BaseRepositoryFindByIdOpts<DummyEntity>,
  ): Promise<DummyEntity | null> {
    return this.store.find((e) => e.id === id) || null;
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

  private matchWhere(where: Record<string, unknown>): DummyEntity | null {
    return (
      this.store.find((e) =>
        Object.entries(where).every(([k, v]) => {
          const entityValue = (e as unknown as Record<string, unknown>)[k];
          return entityValue === v;
        }),
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
    this.store = this.store.filter((e) => e.id !== id);
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

class DummyService extends BaseService<DummyEntity> {
  // Override hooks for testing
  protected async beforeCreate(
    data: Partial<DummyEntity>,
  ): Promise<Partial<DummyEntity>> {
    return { ...data, status: 'ACTIVE' };
  }

  protected async afterCreate(entity: DummyEntity): Promise<void> {
    // Test hook implementation
  }

  protected async beforeUpdate(
    id: string,
    patch: Partial<DummyEntity>,
  ): Promise<void> {
    // Test hook implementation
  }

  protected async afterUpdate(entity: DummyEntity): Promise<void> {
    // Test hook implementation
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Test hook implementation
  }

  protected async afterDelete(id: string): Promise<void> {
    // Test hook implementation
  }
}

describe('BaseService', () => {
  let repo: InMemoryRepo;
  let service: DummyService;

  beforeEach(() => {
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
    repo = new InMemoryRepo(seed);
    service = new DummyService(repo, { entityName: 'Dummy' });
  });

  it('listOffset returns PaginationFormatter.offset envelope', async () => {
    const dto = Object.assign(new AdvancedPaginationDto(), {
      page: 1,
      limit: 1,
      sortBy: 'createdAt',
      order: 'ASC',
    });
    const page = await service.listOffset(dto);
    const expected = PaginationFormatter.offset([repo['store'][0]], 2, 1, 1);
    expect(page).toEqual(expected);
  });

  describe('Batch Operations', () => {
    describe('createMany', () => {
      it('should create multiple entities in batch', async () => {
        const data = [
          { name: 'Entity 1' },
          { name: 'Entity 2' },
          { name: 'Entity 3' },
        ];

        const result = await service.createMany(data);

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Entity 1');
        expect(result[1].name).toBe('Entity 2');
        expect(result[2].name).toBe('Entity 3');
        expect(result[0].status).toBe('ACTIVE'); // from beforeCreate hook
        expect(result[1].status).toBe('ACTIVE');
        expect(result[2].status).toBe('ACTIVE');
      });

      it('should handle empty array', async () => {
        const result = await service.createMany([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('updateMany', () => {
      it('should update multiple entities in batch', async () => {
        // First create some entities
        const entities = await service.createMany([
          { name: 'Original 1' },
          { name: 'Original 2' },
        ]);

        const updates = [
          { id: entities[0].id, patch: { name: 'Updated 1' } },
          { id: entities[1].id, patch: { name: 'Updated 2' } },
        ];

        const result = await service.updateMany(updates);

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Updated 1');
        expect(result[1].name).toBe('Updated 2');
      });

      it('should handle empty updates array', async () => {
        const result = await service.updateMany([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('removeMany', () => {
      it('should remove multiple entities in batch', async () => {
        // First create some entities
        const entities = await service.createMany([
          { name: 'To Delete 1' },
          { name: 'To Delete 2' },
          { name: 'To Keep' },
        ]);

        const idsToDelete = [entities[0].id, entities[1].id];

        await service.removeMany(idsToDelete);

        // Verify entities are deleted
        const remaining = await service.listOffset(
          Object.assign(new AdvancedPaginationDto(), { page: 1, limit: 10 }),
        );
        expect(remaining.result).toHaveLength(1);
        expect(remaining.result[0].name).toBe('To Keep');
      });

      it('should handle empty ids array', async () => {
        await expect(service.removeMany([])).resolves.not.toThrow();
      });
    });

    describe('softDeleteMany', () => {
      it('should soft delete multiple entities in batch', async () => {
        // First create some entities
        const entities = await service.createMany([
          { name: 'To Soft Delete 1' },
          { name: 'To Soft Delete 2' },
          { name: 'To Keep' },
        ]);

        const idsToSoftDelete = [entities[0].id, entities[1].id];

        await service.softDeleteMany(idsToSoftDelete);

        // Verify entities are soft deleted (in this mock implementation, they're actually deleted)
        const remaining = await service.listOffset(
          Object.assign(new AdvancedPaginationDto(), { page: 1, limit: 10 }),
        );
        expect(remaining.result).toHaveLength(1);
        expect(remaining.result[0].name).toBe('To Keep');
      });

      it('should handle empty ids array', async () => {
        await expect(service.softDeleteMany([])).resolves.not.toThrow();
      });
    });
  });
});
