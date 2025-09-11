import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReactionsService } from './reactions.service';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CacheService } from 'src/shared/services';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let reactionRepository: Repository<Reaction>;
  let reactionCountRepository: Repository<ReactionCount>;
  let dataSource: DataSource;
  let cacheService: CacheService;
  let eventEmitter: EventEmitter2;

  const mockReaction = {
    id: '1',
    userId: '1',
    subjectType: 'article',
    subjectId: '1',
    kind: 'like',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    uuid: 'test-uuid',
    version: 1,
    generateId: jest.fn(),
    toJSON: jest.fn(),
    isDeleted: jest.fn(),
    getAge: jest.fn(),
    getTimeSinceUpdate: jest.fn(),
  } as unknown as Reaction;

  const mockReactionCount = {
    id: '1',
    subjectType: 'article',
    subjectId: '1',
    kind: 'like',
    count: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    uuid: 'test-uuid',
    version: 1,
    generateId: jest.fn(),
    toJSON: jest.fn(),
    isDeleted: jest.fn(),
    getAge: jest.fn(),
    getTimeSinceUpdate: jest.fn(),
  } as unknown as ReactionCount;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        {
          provide: getRepositoryToken(Reaction),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findAndCount: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
            })),
            metadata: {
              columns: [
                { propertyName: 'deletedAt' },
              ],
            },
            manager: {
              connection: {
                createQueryRunner: jest.fn(() => ({
                  connect: jest.fn(),
                  startTransaction: jest.fn(),
                  commitTransaction: jest.fn(),
                  rollbackTransaction: jest.fn(),
                  release: jest.fn(),
                  manager: {
                    save: jest.fn(),
                    update: jest.fn(),
                    findOne: jest.fn(),
                  },
                })),
              },
            },
          },
        },
        {
          provide: getRepositoryToken(ReactionCount),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deleteKeysByPattern: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
    reactionRepository = module.get<Repository<Reaction>>(
      getRepositoryToken(Reaction),
    );
    reactionCountRepository = module.get<Repository<ReactionCount>>(
      getRepositoryToken(ReactionCount),
    );
    dataSource = module.get<DataSource>(DataSource);
    cacheService = module.get<CacheService>(CacheService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toggle', () => {
    it('should create a new reaction when none exists', async () => {
      const userId = '1';
      const dto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'toggle' as const,
      };

      jest.spyOn(reactionRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(service, 'set').mockResolvedValue(mockReaction);

      const result = await service.toggle(userId, dto);

      expect(result).toEqual(mockReaction);
      expect(service.set).toHaveBeenCalledWith(userId, dto);
    });

    it('should remove existing reaction when one exists', async () => {
      const userId = '1';
      const dto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'toggle' as const,
      };

      jest.spyOn(reactionRepository, 'findOne').mockResolvedValue(mockReaction);
      jest.spyOn(service, 'unset').mockResolvedValue(null);

      const result = await service.toggle(userId, dto);

      expect(result).toBeNull();
      expect(service.unset).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('set', () => {
    it('should create a new reaction and update count', async () => {
      const userId = '1';
      const dto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'set' as const,
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          save: jest.fn().mockResolvedValue(mockReaction),
          update: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);
      jest.spyOn(service as any, 'getCount').mockResolvedValue(5);

      const result = await service.set(userId, dto);

      expect(result).toEqual(mockReaction);
      expect(eventEmitter.emit).toHaveBeenCalledWith('reaction.set', {
        userId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        kind: dto.kind,
        count: 5,
      });
    });
  });

  describe('unset', () => {
    it('should soft delete reaction and update count', async () => {
      const userId = '1';
      const dto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'unset' as const,
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          update: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);
      jest.spyOn(service as any, 'getCount').mockResolvedValue(4);

      const result = await service.unset(userId, dto);

      expect(result).toBeNull();
      expect(eventEmitter.emit).toHaveBeenCalledWith('reaction.unset', {
        userId,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        kind: dto.kind,
        count: 4,
      });
    });
  });

  describe('list', () => {
    it('should return paginated reactions', async () => {
      const dto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        userId: '1',
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue({
        result: [mockReaction],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          hasNextPage: false,
        },
      });

      const result = await service.list(dto);

      expect(result).toEqual({
        reactions: [mockReaction],
        total: 1,
      });
    });
  });

  describe('hasReacted', () => {
    it('should return true when user has reacted', async () => {
      const userId = '1';
      const subjectType = 'article';
      const subjectId = '1';
      const kind = 'like';

      jest.spyOn(reactionRepository, 'findOne').mockResolvedValue(mockReaction);

      const result = await service.hasReacted(
        userId,
        subjectType,
        subjectId,
        kind,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has not reacted', async () => {
      const userId = '1';
      const subjectType = 'article';
      const subjectId = '1';
      const kind = 'like';

      jest.spyOn(reactionRepository, 'findOne').mockResolvedValue(null);

      const result = await service.hasReacted(
        userId,
        subjectType,
        subjectId,
        kind,
      );

      expect(result).toBe(false);
    });
  });

  describe('getCounts', () => {
    it('should return cached counts when available', async () => {
      const subjectType = 'article';
      const subjectId = '1';
      const kinds = ['like', 'bookmark'];

      jest.spyOn(cacheService, 'get').mockResolvedValue([mockReactionCount]);

      const result = await service.getCounts(subjectType, subjectId, kinds);

      expect(result).toEqual([mockReactionCount]);
      expect(cacheService.get).toHaveBeenCalledWith(
        `reactions:counts:${subjectType}:${subjectId}:${kinds.join(',')}`,
      );
    });

    it('should fetch and cache counts when not cached', async () => {
      const subjectType = 'article';
      const subjectId = '1';
      const kinds = ['like', 'bookmark'];

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockReactionCount]),
      };

      jest
        .spyOn(reactionCountRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCounts(subjectType, subjectId, kinds);

      expect(result).toEqual([mockReactionCount]);
      expect(cacheService.set).toHaveBeenCalledWith(
        `reactions:counts:${subjectType}:${subjectId}:${kinds.join(',')}`,
        [mockReactionCount],
        60,
      );
    });
  });

  describe('getCountsBatch', () => {
    it('should return cached batch counts when available', async () => {
      const dto = {
        subjectType: 'article',
        subjectIds: ['1', '2', '3'],
        kinds: ['like', 'bookmark'],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue([mockReactionCount]);

      const result = await service.getCountsBatch(dto);

      expect(result).toEqual([mockReactionCount]);
      expect(cacheService.get).toHaveBeenCalledWith(
        `reactions:counts:batch:${dto.subjectType}:${dto.subjectIds.join(',')}:${dto.kinds.join(',')}`,
      );
    });

    it('should fetch and cache batch counts when not cached', async () => {
      const dto = {
        subjectType: 'article',
        subjectIds: ['1', '2', '3'],
        kinds: ['like', 'bookmark'],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockReactionCount]),
      };

      jest
        .spyOn(reactionCountRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCountsBatch(dto);

      expect(result).toEqual([mockReactionCount]);
      expect(cacheService.set).toHaveBeenCalledWith(
        `reactions:counts:batch:${dto.subjectType}:${dto.subjectIds.join(',')}:${dto.kinds.join(',')}`,
        [mockReactionCount],
        60,
      );
    });
  });
});
