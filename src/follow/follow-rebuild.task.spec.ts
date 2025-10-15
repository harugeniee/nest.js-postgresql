import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserFollowBitset } from './entities/user-follow-bitset.entity';
import { UserFollowEdge } from './entities/user-follow-edge.entity';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { FollowRebuildTask } from './tasks/follow.rebuild.task';

describe('FollowRebuildTask', () => {
  let service: FollowRebuildTask;
  let bitsetRepo: any;
  let edgeRepo: any;
  let followBitsetService: jest.Mocked<FollowBitsetService>;
  let cacheService: jest.Mocked<FollowCacheService>;

  const mockBitset = {
    userId: 'user123',
    followingCount: 10,
    followerCount: 5,
    lastRebuildAt: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25 hours ago
    needsRebuild: jest.fn().mockReturnValue(true),
  };

  const mockEdge = {
    followerId: 'user123',
    followeeId: 'user456',
    status: 'active',
  };

  beforeEach(async () => {
    const mockBitsetRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockEdgeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    const mockFollowBitsetService = {
      rebuildFromEdges: jest.fn(),
    };

    const mockCacheService = {
      invalidateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowRebuildTask,
        {
          provide: getRepositoryToken(UserFollowBitset),
          useValue: mockBitsetRepo,
        },
        {
          provide: getRepositoryToken(UserFollowEdge),
          useValue: mockEdgeRepo,
        },
        {
          provide: FollowBitsetService,
          useValue: mockFollowBitsetService,
        },
        {
          provide: FollowCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<FollowRebuildTask>(FollowRebuildTask);
    bitsetRepo = module.get(getRepositoryToken(UserFollowBitset));
    edgeRepo = module.get(getRepositoryToken(UserFollowEdge));
    followBitsetService = module.get(FollowBitsetService);
    cacheService = module.get(FollowCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('rebuildBitsets', () => {
    it('should rebuild all bitsets that need rebuilding', async () => {
      const mockBitsets = [mockBitset, { ...mockBitset, userId: 'user456' }];

      // Mock the query builder
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBitsets),
      };

      bitsetRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);
      followBitsetService.rebuildFromEdges.mockResolvedValue({
        success: true,
        count: 10,
      });

      await service.rebuildBitsets();

      expect(bitsetRepo.createQueryBuilder).toHaveBeenCalledWith('bitset');
      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledTimes(2);
      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledWith(
        'user123',
        true,
      );
      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledWith(
        'user456',
        true,
      );
    });

    it('should handle rebuild errors gracefully', async () => {
      const mockBitsets = [mockBitset];
      bitsetRepo.find.mockResolvedValue(mockBitsets);
      followBitsetService.rebuildFromEdges.mockRejectedValue(
        new Error('Rebuild error'),
      );

      // Should not throw
      await expect(service.rebuildBitsets()).resolves.toBeUndefined();
    });

    it('should skip bitsets that do not need rebuilding', async () => {
      const mockBitsetNoRebuild = {
        ...mockBitset,
        needsRebuild: jest.fn().mockReturnValue(false),
      };
      bitsetRepo.find.mockResolvedValue([mockBitsetNoRebuild]);

      await service.rebuildBitsets();

      expect(followBitsetService.rebuildFromEdges).not.toHaveBeenCalled();
    });
  });

  describe('rebuildUserBitsets', () => {
    it('should rebuild bitsets for specific users', async () => {
      const userIds = ['user123', 'user456'];
      followBitsetService.rebuildFromEdges
        .mockResolvedValueOnce({ success: true, count: 10 })
        .mockResolvedValueOnce({ success: true, count: 5 });

      const result = await service.rebuildUserBitsets(userIds);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledTimes(2);
    });

    it('should count failed rebuilds', async () => {
      const userIds = ['user123', 'user456'];
      followBitsetService.rebuildFromEdges
        .mockResolvedValueOnce({ success: true, count: 10 })
        .mockRejectedValueOnce(new Error('Rebuild error'));

      const result = await service.rebuildUserBitsets(userIds);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle empty user list', async () => {
      const result = await service.rebuildUserBitsets([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(followBitsetService.rebuildFromEdges).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldEdges', () => {
    it('should cleanup old deleted edges', async () => {
      edgeRepo.delete.mockResolvedValue({ affected: 2 });

      await service.cleanupOldEdges();

      expect(edgeRepo.delete).toHaveBeenCalledWith({
        status: 'deleted',
        deletedAt: expect.any(Object), // LessThan 30 days ago
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      edgeRepo.find.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.cleanupOldEdges()).resolves.toBeUndefined();
    });
  });

  describe('validateConsistency', () => {
    it('should validate bitset consistency', async () => {
      const mockBitsets = [
        {
          userId: 'user123',
          followingCount: 10,
          followerCount: 5,
        },
        {
          userId: 'user456',
          followingCount: 3,
          followerCount: 8,
        },
      ];

      // Mock the query builder
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBitsets),
      };

      bitsetRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);
      jest.spyOn(service as any, 'validateUserBitset').mockResolvedValue(true);

      await service.validateConsistency();

      expect(bitsetRepo.createQueryBuilder).toHaveBeenCalledWith('bitset');
    });

    it('should handle validation errors gracefully', async () => {
      bitsetRepo.find.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.validateConsistency()).resolves.toBeUndefined();
    });
  });

  describe('getUsersNeedingRebuild', () => {
    it('should return users that need rebuild', async () => {
      const mockBitsets = [
        {
          userId: 'user123',
          needsRebuild: jest.fn().mockReturnValue(true),
        },
        {
          userId: 'user789',
          needsRebuild: jest.fn().mockReturnValue(true),
        },
      ];

      // Mock the query builder
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBitsets),
      };

      bitsetRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await (service as any).getUsersNeedingRebuild();

      expect(result).toEqual(['user123', 'user789']);
    });

    it('should handle database errors', async () => {
      bitsetRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await (service as any).getUsersNeedingRebuild();

      expect(result).toEqual([]);
    });
  });

  describe('processBatch', () => {
    it('should process batch of users', async () => {
      const userIds = ['user123', 'user456'];
      followBitsetService.rebuildFromEdges
        .mockResolvedValueOnce({ success: true, count: 10 })
        .mockResolvedValueOnce({ success: true, count: 5 });

      await (service as any).processBatch(userIds);

      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledTimes(2);
    });

    it('should handle batch processing errors', async () => {
      const userIds = ['user123'];
      followBitsetService.rebuildFromEdges.mockRejectedValue(
        new Error('Rebuild error'),
      );

      // Should not throw
      await expect(
        (service as any).processBatch(userIds),
      ).resolves.toBeUndefined();
    });
  });

  describe('rebuildUserBitset', () => {
    it('should rebuild single user bitset', async () => {
      followBitsetService.rebuildFromEdges.mockResolvedValue({
        success: true,
        count: 10,
      });

      const result = await (service as any).rebuildUserBitset('user123');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(followBitsetService.rebuildFromEdges).toHaveBeenCalledWith(
        'user123',
        true,
      );
    });

    it('should handle rebuild failure', async () => {
      followBitsetService.rebuildFromEdges.mockRejectedValue(
        new Error('Rebuild error'),
      );

      const result = await (service as any).rebuildUserBitset('user123');

      expect(result.success).toBe(false);
      expect(result.userId).toBe('user123');
    });
  });

  describe('validateUserBitset', () => {
    it('should validate user bitset consistency', async () => {
      const mockBitset = {
        userId: 'user123',
        followingCount: 2,
        followerCount: 1,
      };

      const mockEdges = [
        { followerId: 'user123', followeeId: 'user456', status: 'active' },
        { followerId: 'user123', followeeId: 'user789', status: 'active' },
        { followerId: 'user456', followeeId: 'user123', status: 'active' },
      ];

      bitsetRepo.findOne.mockResolvedValue(mockBitset);
      edgeRepo.count
        .mockResolvedValueOnce(2) // following count
        .mockResolvedValueOnce(1); // followers count

      const result = await (service as any).validateUserBitset('user123');

      expect(result).toBe(true);
      expect(bitsetRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      });
    });

    it('should return false for inconsistent bitset', async () => {
      const mockBitset = {
        userId: 'user123',
        followingCount: 5, // Inconsistent with actual edges
        followerCount: 1,
      };

      const mockEdges = [
        { followerId: 'user123', followeeId: 'user456', status: 'active' },
        { followerId: 'user456', followeeId: 'user123', status: 'active' },
      ];

      bitsetRepo.findOne.mockResolvedValue(mockBitset);
      edgeRepo.find.mockResolvedValue(mockEdges);

      const result = await (service as any).validateUserBitset('user123');

      expect(result).toBe(false);
    });

    it('should handle validation errors', async () => {
      bitsetRepo.findOne.mockRejectedValue(new Error('Database error'));

      const result = await (service as any).validateUserBitset('user123');

      expect(result).toBe(false);
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into smaller arrays', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunkSize = 3;

      const result = (service as any).chunkArray(array, chunkSize);

      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it('should handle empty array', () => {
      const result = (service as any).chunkArray([], 3);

      expect(result).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      const array = [1, 2];
      const result = (service as any).chunkArray(array, 5);

      expect(result).toEqual([[1, 2]]);
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      // Mock the count methods
      bitsetRepo.count
        .mockResolvedValueOnce(2) // total bitsets
        .mockResolvedValueOnce(1); // needs rebuild

      // Mock the query builder for lastRebuild
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ lastRebuild: new Date() }),
      };
      bitsetRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getTaskStats();

      expect(result).toMatchObject({
        totalBitsets: 2,
        needsRebuild: 1,
        lastRebuild: expect.any(Date),
        avgRebuildTime: 0,
      });
    });

    it('should handle empty bitsets', async () => {
      bitsetRepo.find.mockResolvedValue([]);

      const result = await service.getTaskStats();

      expect(result).toMatchObject({
        totalBitsets: 0,
        needsRebuild: 0,
        lastRebuild: null,
        avgRebuildTime: 0,
      });
    });

    it('should handle database errors', async () => {
      bitsetRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await service.getTaskStats();

      expect(result).toMatchObject({
        totalBitsets: 0,
        needsRebuild: 0,
        lastRebuild: null,
        avgRebuildTime: 0,
      });
    });
  });
});
