import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLBaseService } from './graphql-base.service';
import {
  BaseRepository,
  BaseRepositoryFindByIdOpts,
} from '../repositories/base.repository';
import { CacheService } from 'src/shared/services';
import { GraphQLPaginationDto } from '../dto/graphql-pagination.dto';
import { DeepPartial } from 'typeorm';

// Set required environment variable for cursor tests
process.env.CURSOR_HMAC_SECRET = 'test-cursor-secret-key';

// Mock entity for testing
interface MockEntity {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended repository interface for GraphQL support
interface GraphQLBaseRepository<T> extends BaseRepository<T> {
  findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<T>): Promise<T[]>;
}

// Token for dependency injection
const GRAPHQL_REPOSITORY_TOKEN = 'GRAPHQL_REPOSITORY_TOKEN';

// Mock repository implementing the required interface
class MockRepository implements GraphQLBaseRepository<MockEntity> {
  async findByIds(ids: string[]): Promise<MockEntity[]> {
    const mockData: MockEntity[] = [
      {
        id: '1',
        name: 'User 1',
        email: 'user1@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'User 2',
        email: 'user2@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'User 3',
        email: 'user3@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    return mockData.filter((entity) => ids.includes(entity.id));
  }

  async findAndCount(): Promise<[MockEntity[], number]> {
    const mockData: MockEntity[] = [
      {
        id: '1',
        name: 'User 1',
        email: 'user1@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'User 2',
        email: 'user2@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    return [mockData, 2];
  }

  // Implement other required methods
  async findById(): Promise<MockEntity | null> {
    return null;
  }
  async findOne(): Promise<MockEntity | null> {
    return null;
  }
  create(data: DeepPartial<MockEntity>): MockEntity {
    return {
      id: '1',
      name: 'User 1',
      email: 'user1@test.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as MockEntity;
  }
  async save(): Promise<MockEntity> {
    return {} as MockEntity;
  }
  async saveMany(): Promise<MockEntity[]> {
    return [];
  }
  async updateById(): Promise<void> {}
  async deleteById(): Promise<void> {}
  async softDeleteById(): Promise<void> {}
  async restoreById(): Promise<void> {}
  async withTransaction(): Promise<any> {
    return Promise.resolve();
  }
  supportsSoftDelete(): boolean {
    return true;
  }
}

// Concrete implementation for testing
class TestGraphQLService extends GraphQLBaseService<MockEntity> {
  constructor(
    repo: GraphQLBaseRepository<MockEntity>,
    cacheService?: CacheService,
  ) {
    super(
      repo,
      {
        entityName: 'MockEntity',
        cache: { enabled: true, prefix: 'test', ttlSec: 3600 },
        emitEvents: true,
      },
      cacheService,
    );
  }
}

describe('GraphQLBaseService', () => {
  let service: TestGraphQLService;
  let mockRepo: MockRepository;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    mockRepo = new MockRepository();
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deleteKeysByPattern: jest.fn(),
      deleteKeysBySuffix: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TestGraphQLService,
          useFactory: () => new TestGraphQLService(mockRepo, mockCacheService),
        },
      ],
    }).compile();

    service = module.get<TestGraphQLService>(TestGraphQLService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByIds', () => {
    it('should return entities in correct order', async () => {
      const ids = ['2', '1', '3'];
      const result = await service.findByIds(ids);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('2');
      expect(result[1]?.id).toBe('1');
      expect(result[2]?.id).toBe('3');
    });

    it('should handle empty ids array', async () => {
      const result = await service.findByIds([]);
      expect(result).toEqual([]);
    });

    it('should handle missing entities', async () => {
      const ids = ['1', '999', '3'];
      const result = await service.findByIds(ids);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('1');
      expect(result[1]).toBeNull();
      expect(result[2]?.id).toBe('3');
    });
  });

  describe('findByIdsMap', () => {
    it('should return Map with correct key-value pairs', async () => {
      const ids = ['1', '2'];
      const result = await service.findByIdsMap(ids);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('1')?.id).toBe('1');
      expect(result.get('2')?.id).toBe('2');
    });

    it('should handle empty ids array', async () => {
      const result = await service.findByIdsMap([]);
      expect(result.size).toBe(0);
    });
  });

  describe('listGraphQL', () => {
    it('should validate pagination parameters', async () => {
      const invalidPagination: GraphQLPaginationDto = {
        first: 10,
        last: 5, // Cannot use both first and last
        sortBy: 'createdAt',
        order: 'DESC',
      };

      await expect(service.listGraphQL(invalidPagination)).rejects.toThrow(
        'Cannot use both first and last parameters',
      );
    });

    it('should validate cursor parameters', async () => {
      const invalidPagination: GraphQLPaginationDto = {
        after: 'cursor1',
        before: 'cursor2', // Cannot use both after and before
        sortBy: 'createdAt',
        order: 'DESC',
      };

      await expect(service.listGraphQL(invalidPagination)).rejects.toThrow(
        'Cannot use both after and before parameters',
      );
    });

    it('should use default values when pagination is not provided', async () => {
      const pagination: GraphQLPaginationDto = {
        sortBy: 'createdAt',
        order: 'DESC',
      };
      const result = await service.listGraphQL(pagination);

      expect(result.edges).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('batchLoadByIds', () => {
    it('should use cache when available', async () => {
      const ids = ['1', '2'];
      const cachedData = [
        { id: '1', name: 'User 1' } as MockEntity,
        { id: '2', name: 'User 2' } as MockEntity,
      ];

      const getSpy = jest
        .spyOn(mockCacheService, 'get')
        .mockResolvedValue(cachedData);

      const result = await service.batchLoadByIds(ids);

      expect(getSpy).toHaveBeenCalledWith('test:batch:1,2');
      expect(result).toEqual(cachedData);
    });

    it('should fallback to database when cache miss', async () => {
      const ids = ['1', '2'];

      jest.spyOn(mockCacheService, 'get').mockResolvedValue(null);
      const setSpy = jest.spyOn(mockCacheService, 'set');

      const result = await service.batchLoadByIds(ids);

      expect(setSpy).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('GraphQL field selection', () => {
    it('should extract fields from GraphQL info', async () => {
      const mockGraphQLInfo = {
        fieldNodes: [
          {
            kind: 'Field',
            name: { value: 'name' },
            selectionSet: {
              selections: [
                { kind: 'Field', name: { value: 'email' } },
                { kind: 'Field', name: { value: 'createdAt' } },
              ],
            },
          },
        ],
      };

      const result = await service.findWithGraphQLFields(
        { id: '1' },
        mockGraphQLInfo,
      );

      expect(result).toBeDefined();
    });

    it('should handle field extraction errors gracefully', async () => {
      const invalidGraphQLInfo = {
        fieldNodes: null, // Invalid structure
      };

      const result = await service.findWithGraphQLFields(
        { id: '1' },
        invalidGraphQLInfo as any,
      );

      expect(result).toBeDefined();
    });
  });
});
