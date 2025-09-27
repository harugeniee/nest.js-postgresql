import { Test, TestingModule } from '@nestjs/testing';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CreateOrSetReactionDto } from './dto/create-reaction.dto';
import { QueryReactionsDto } from './dto/query-reactions.dto';
import { BatchCountsDto } from './dto/batch-counts.dto';
import { JwtAccessTokenGuard } from 'src/auth/guard';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/shared/services';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { Reflector } from '@nestjs/core';

describe('ReactionsController', () => {
  let controller: ReactionsController;
  let service: ReactionsService;

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
      controllers: [ReactionsController],
      providers: [
        {
          provide: ReactionsService,
          useValue: {
            toggle: jest.fn(),
            set: jest.fn(),
            unset: jest.fn(),
            list: jest.fn(),
            hasReacted: jest.fn(),
            getCounts: jest.fn(),
            getCountsBatch: jest.fn(),
          },
        },
        {
          provide: JwtAccessTokenGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackEvent: jest.fn().mockResolvedValue({}),
            getUserAnalytics: jest.fn().mockResolvedValue({}),
            getContentPerformance: jest.fn().mockResolvedValue({}),
            getPlatformOverview: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReactionsController>(ReactionsController);
    service = module.get<ReactionsService>(ReactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrSetReaction', () => {
    it('should call toggle when action is toggle', async () => {
      const req = { user: { uid: '1' } } as any;
      const dto: CreateOrSetReactionDto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'toggle',
      };

      jest.spyOn(service, 'toggle').mockResolvedValue(mockReaction);

      const result = await controller.createOrSetReaction(req, dto);

      expect(result).toEqual(mockReaction);
      expect(service.toggle).toHaveBeenCalledWith('1', dto);
    });

    it('should call set when action is set', async () => {
      const req = { user: { uid: '1' } } as any;
      const dto: CreateOrSetReactionDto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'set',
      };

      jest.spyOn(service, 'set').mockResolvedValue(mockReaction);

      const result = await controller.createOrSetReaction(req, dto);

      expect(result).toEqual(mockReaction);
      expect(service.set).toHaveBeenCalledWith('1', dto);
    });

    it('should call unset when action is unset', async () => {
      const req = { user: { uid: '1' } } as any;
      const dto: CreateOrSetReactionDto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        action: 'unset',
      };

      jest.spyOn(service, 'unset').mockResolvedValue(null);

      const result = await controller.createOrSetReaction(req, dto);

      expect(result).toBeNull();
      expect(service.unset).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('unsetReaction', () => {
    it('should call unset service method', async () => {
      const req = { user: { uid: '1' } } as any;
      const dto: CreateOrSetReactionDto = {
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
      };

      jest.spyOn(service, 'unset').mockResolvedValue(null);

      const result = await controller.unsetReaction(req, dto);

      expect(result).toBeNull();
      expect(service.unset).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('listReactions', () => {
    it('should call list service method', async () => {
      const dto: QueryReactionsDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        subjectType: 'article',
        subjectId: '1',
        kind: 'like',
        userId: '1',
      };

      const mockResult = {
        reactions: [mockReaction],
        total: 1,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockResult);

      const result = await controller.listReactions(dto);

      expect(result).toEqual(mockResult);
      expect(service.list).toHaveBeenCalledWith(dto);
    });
  });

  describe('hasReacted', () => {
    it('should call hasReacted service method with correct parameters', async () => {
      const req = { user: { uid: '1' } } as any;
      const subjectType = 'article';
      const subjectId = '1';
      const kind = 'like';

      jest.spyOn(service, 'hasReacted').mockResolvedValue(true);

      const result = await controller.hasReacted(
        req,
        subjectType,
        subjectId,
        kind,
      );

      expect(result).toBe(true);
      expect(service.hasReacted).toHaveBeenCalledWith(
        '1',
        subjectType,
        subjectId,
        kind,
      );
    });
  });

  describe('getCountsBatch', () => {
    it('should call getCountsBatch service method', async () => {
      const dto: BatchCountsDto = {
        subjectType: 'article',
        subjectIds: ['1', '2', '3'],
        kinds: ['like', 'bookmark'],
      };

      jest
        .spyOn(service, 'getCountsBatch')
        .mockResolvedValue([mockReactionCount]);

      const result = await controller.getCountsBatch(dto);

      expect(result).toEqual([mockReactionCount]);
      expect(service.getCountsBatch).toHaveBeenCalledWith(dto);
    });
  });

  describe('getCounts', () => {
    it('should call getCounts service method with correct parameters', async () => {
      const subjectType = 'article';
      const subjectId = '1';
      const kinds = 'like,bookmark';

      jest.spyOn(service, 'getCounts').mockResolvedValue([mockReactionCount]);

      const result = await controller.getCounts(subjectType, subjectId, kinds);

      expect(result).toEqual([mockReactionCount]);
      expect(service.getCounts).toHaveBeenCalledWith(subjectType, subjectId, [
        'like',
        'bookmark',
      ]);
    });

    it('should call getCounts service method without kinds when not provided', async () => {
      const subjectType = 'article';
      const subjectId = '1';

      jest.spyOn(service, 'getCounts').mockResolvedValue([mockReactionCount]);

      const result = await controller.getCounts(subjectType, subjectId);

      expect(result).toEqual([mockReactionCount]);
      expect(service.getCounts).toHaveBeenCalledWith(
        subjectType,
        subjectId,
        undefined,
      );
    });
  });
});
