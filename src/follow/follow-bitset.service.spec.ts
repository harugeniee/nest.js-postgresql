import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { UserFollowBitset } from './entities/user-follow-bitset.entity';
import { UserFollowEdge } from './entities/user-follow-edge.entity';
import { RoaringAdapter, RoaringSet } from './adapters/roaring.adapter';

describe('FollowBitsetService', () => {
  let service: FollowBitsetService;

  const mockRoaringSet: Partial<RoaringSet> = {
    has: jest.fn().mockReturnValue(false),
    add: jest.fn(),
    remove: jest.fn(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    andNot: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockReturnValue(Buffer.from('mock')),
    size: jest.fn().mockReturnValue(0),
    toArray: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
    isEmpty: jest.fn().mockReturnValue(true),
  };

  const mockRoaringAdapter: Partial<RoaringAdapter> = {
    init: jest.fn().mockResolvedValue(undefined),
    newSet: jest.fn().mockReturnValue(mockRoaringSet as RoaringSet),
    fromSerialized: jest.fn().mockReturnValue(mockRoaringSet as RoaringSet),
    isReady: jest.fn().mockReturnValue(true),
  };

  const mockCacheService: Partial<FollowCacheService> = {
    getFollowingSet: jest.fn().mockResolvedValue(null),
    saveFollowingSet: jest.fn().mockResolvedValue(undefined),
    getFollowersSet: jest.fn().mockResolvedValue(null),
    saveFollowersSet: jest.fn().mockResolvedValue(undefined),
    getCounters: jest.fn().mockResolvedValue(null),
    setCounters: jest.fn().mockResolvedValue(undefined),
    incrFollowing: jest.fn().mockResolvedValue(1),
    incrFollowers: jest.fn().mockResolvedValue(1),
    decrFollowing: jest.fn().mockResolvedValue(0),
    decrFollowers: jest.fn().mockResolvedValue(0),
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    isFollowing: jest.fn().mockResolvedValue(false),
  };

  const mockBitsetRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    upsert: jest.fn(),
  };

  const mockEdgeRepo = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowBitsetService,
        {
          provide: getRepositoryToken(UserFollowBitset),
          useValue: mockBitsetRepo,
        },
        {
          provide: getRepositoryToken(UserFollowEdge),
          useValue: mockEdgeRepo,
        },
        {
          provide: FollowCacheService,
          useValue: mockCacheService,
        },
        {
          provide: 'ROARING_ADAPTER',
          useValue: mockRoaringAdapter,
        },
      ],
    }).compile();

    service = module.get<FollowBitsetService>(FollowBitsetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('follow', () => {
    it('should successfully follow a user', async () => {
      const followerId = '123';
      const followeeId = '456';

      mockCacheService.getFollowingSet = jest.fn().mockResolvedValue(null);
      mockRoaringSet.isEmpty = jest.fn().mockReturnValue(true);
      mockRoaringSet.has = jest.fn().mockReturnValue(false);

      const result = await service.follow(followerId, followeeId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('followed');
      expect(mockRoaringSet.add).toHaveBeenCalledWith(456);
      expect(mockCacheService.saveFollowingSet).toHaveBeenCalledWith(
        followerId,
        mockRoaringSet,
      );
    });

    it('should return already_following if user is already following', async () => {
      const followerId = '123';
      const followeeId = '456';

      mockCacheService.getFollowingSet = jest
        .fn()
        .mockResolvedValue(mockRoaringSet as RoaringSet);
      mockRoaringSet.has = jest.fn().mockReturnValue(true);

      const result = await service.follow(followerId, followeeId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('already_following');
      expect(mockRoaringSet.add).not.toHaveBeenCalled();
    });

    it('should throw error if trying to follow self', async () => {
      const userId = '123';

      await expect(service.follow(userId, userId)).rejects.toThrow(
        'Http Exception',
      );
    });
  });

  describe('unfollow', () => {
    it('should successfully unfollow a user', async () => {
      const followerId = '123';
      const followeeId = '456';

      mockCacheService.getFollowingSet = jest
        .fn()
        .mockResolvedValue(mockRoaringSet as RoaringSet);
      mockRoaringSet.has = jest.fn().mockReturnValue(true);

      const result = await service.unfollow(followerId, followeeId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('unfollowed');
      expect(mockRoaringSet.remove).toHaveBeenCalledWith(456);
      expect(mockCacheService.saveFollowingSet).toHaveBeenCalledWith(
        followerId,
        mockRoaringSet,
      );
    });

    it('should return not_following if user is not following', async () => {
      const followerId = '123';
      const followeeId = '456';

      mockCacheService.getFollowingSet = jest.fn().mockResolvedValue(null);

      const result = await service.unfollow(followerId, followeeId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('not_following');
      expect(mockRoaringSet.remove).not.toHaveBeenCalled();
    });
  });

  describe('getFollowingIds', () => {
    it('should return following IDs with pagination', async () => {
      const userId = '123';
      const limit = 10;
      const cursor = '456';

      // Mock the cache service to return a set
      const mockSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456, 789, 101112]),
      };

      // Override the mock for this specific test
      (mockCacheService.getFollowingSet as jest.Mock).mockResolvedValueOnce(
        mockSet as RoaringSet,
      );

      const result = await service.getFollowingIds(userId, limit, cursor);

      // Debug: Check if cache service was called
      expect(mockCacheService.getFollowingSet).toHaveBeenCalledWith(userId);

      // Debug: Check if mock set was returned
      expect(mockSet.toArray).toHaveBeenCalledWith();

      // Debug: Check what the actual result is
      // With cursor '456' at index 0, startIndex = 1, so we get ['789', '101112']
      expect(result).toEqual({
        userIds: ['789', '101112'],
        nextCursor: undefined,
        hasMore: false,
      });
    });

    it('should return empty result if no following set', async () => {
      const userId = '123';

      mockCacheService.getFollowingSet = jest.fn().mockResolvedValue(null);

      const result = await service.getFollowingIds(userId);

      expect(result.userIds).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getMutualFriends', () => {
    it('should return mutual friends between two users', async () => {
      const userIdA = '123';
      const userIdB = '456';
      const limit = 10;

      const mockMutualSet = {
        ...mockRoaringSet,
        size: jest.fn().mockReturnValue(1),
        toArray: jest.fn().mockReturnValue([456]),
      };

      const mockSetA = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456, 789]),
        and: jest.fn().mockReturnValue(mockMutualSet as RoaringSet),
      };
      const mockSetB = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456, 101112]),
      };

      mockCacheService.getFollowingSet = jest
        .fn()
        .mockResolvedValueOnce(mockSetA as RoaringSet)
        .mockResolvedValueOnce(mockSetB as RoaringSet);

      const result = await service.getMutualFriends(userIdA, userIdB, limit);

      expect(result.userIds).toEqual(['456']);
      expect(result.count).toBe(1);
    });
  });

  describe('getCounters', () => {
    it('should return counters from cache', async () => {
      const userId = '123';
      const mockCounters = { following: 10, followers: 5 };

      mockCacheService.getCounters = jest.fn().mockResolvedValue(mockCounters);

      const result = await service.getCounters(userId);

      expect(result).toEqual(mockCounters);
      expect(mockCacheService.getCounters).toHaveBeenCalledWith(userId);
    });

    it('should fallback to database if cache miss', async () => {
      const userId = '123';
      const mockBitset = { followingCount: 10, followerCount: 5 };

      mockCacheService.getCounters = jest.fn().mockResolvedValue(null);
      mockBitsetRepo.findOne = jest.fn().mockResolvedValue(mockBitset);

      const result = await service.getCounters(userId);

      expect(result).toEqual({ following: 10, followers: 5 });
      expect(mockCacheService.setCounters).toHaveBeenCalledWith(userId, 10, 5);
    });
  });
});
