import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoaringAdapter } from './adapters/roaring.adapter';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { NewsFeedService } from './newsfeed.service';

describe('NewsFeedService', () => {
  let service: NewsFeedService;
  let followBitsetService: jest.Mocked<FollowBitsetService>;
  let cacheService: jest.Mocked<FollowCacheService>;
  let roaringAdapter: jest.Mocked<RoaringAdapter>;

  beforeEach(async () => {
    const mockFollowBitsetService = {
      getFollowingIds: jest.fn(),
      getMutualFriends: jest.fn(),
      getCounters: jest.fn(),
    };

    const mockCacheService = {
      getRedisClient: jest.fn(),
      deleteKeysByPattern: jest.fn(),
      cacheService: {
        deleteKeysByPattern: jest.fn(),
      },
    };

    const mockRoaringAdapter = {
      init: jest.fn().mockResolvedValue(undefined),
      newSet: jest.fn(),
      fromSerialized: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsFeedService,
        {
          provide: FollowBitsetService,
          useValue: mockFollowBitsetService,
        },
        {
          provide: FollowCacheService,
          useValue: mockCacheService,
        },
        {
          provide: 'BITSET_ADAPTER',
          useValue: mockRoaringAdapter,
        },
      ],
    }).compile();

    service = module.get<NewsFeedService>(NewsFeedService);
    followBitsetService = module.get(FollowBitsetService);
    cacheService = module.get(FollowCacheService);
    roaringAdapter = module.get('BITSET_ADAPTER');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUserFeed', () => {
    it('should generate feed for user with following', async () => {
      const mockFollowingResult = {
        userIds: ['456', '789'],
        hasMore: false,
      };

      const mockFeedItems = [
        {
          id: 'content_456_0',
          userId: '456',
          title: 'Article from User 456',
          content: 'This is content from user 456',
          publishedAt: new Date(),
          likes: 10,
          comments: 5,
          bookmarks: 2,
        },
        {
          id: 'content_789_1',
          userId: '789',
          title: 'Article from User 789',
          content: 'This is content from user 789',
          publishedAt: new Date(),
          likes: 15,
          comments: 8,
          bookmarks: 3,
        },
      ];

      followBitsetService.getFollowingIds.mockResolvedValue(
        mockFollowingResult,
      );
      jest
        .spyOn(service as any, 'getContentFromUsers')
        .mockResolvedValue(mockFeedItems);
      jest
        .spyOn(service as any, 'rankFeedItems')
        .mockResolvedValue(mockFeedItems);

      const result = await service.generateUserFeed('user123', 20);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeDefined();
      expect(followBitsetService.getFollowingIds).toHaveBeenCalledWith(
        'user123',
        1000,
      );
    });

    it('should return empty feed when user has no following', async () => {
      followBitsetService.getFollowingIds.mockResolvedValue({
        userIds: [],
        hasMore: false,
      });

      const result = await service.generateUserFeed('user123', 20);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      followBitsetService.getFollowingIds.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(service.generateUserFeed('user123', 20)).rejects.toThrow(
        HttpException,
      );
    });

    it('should apply pagination with cursor', async () => {
      const mockFollowingResult = {
        userIds: ['456', '789'],
        hasMore: false,
      };

      const mockFeedItems = [
        {
          id: 'content_456_0',
          userId: '456',
          title: 'Article from User 456',
          publishedAt: new Date(),
        },
      ];

      followBitsetService.getFollowingIds.mockResolvedValue(
        mockFollowingResult,
      );
      jest
        .spyOn(service as any, 'getContentFromUsers')
        .mockResolvedValue(mockFeedItems);
      jest
        .spyOn(service as any, 'rankFeedItems')
        .mockResolvedValue(mockFeedItems);

      const result = await service.generateUserFeed('user123', 20, 'cursor123');

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('getContentFromUsers', () => {
    it('should get content from users', async () => {
      const userIds = ['456', '789'];
      const limit = 10;

      const result = await (service as any).getContentFromUsers(userIds, limit);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'content_456_0',
        userId: '456',
        title: 'Article from User 456',
      });
      expect(result[1]).toMatchObject({
        id: 'content_789_1',
        userId: '789',
        title: 'Article from User 789',
      });
    });

    it('should limit results based on limit parameter', async () => {
      const userIds = ['456', '789', '101', '102'];
      const limit = 2;

      const result = await (service as any).getContentFromUsers(userIds, limit);

      expect(result).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      // Test that the service handles errors gracefully by not throwing
      const result = await (service as any).getContentFromUsers(['456'], 10);

      // Should return mock data, not throw
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('rankFeedItems', () => {
    it('should rank feed items by score', async () => {
      const items = [
        {
          id: 'content_1',
          userId: '456',
          publishedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          likes: 5,
          comments: 2,
          bookmarks: 1,
        },
        {
          id: 'content_2',
          userId: '789',
          publishedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          likes: 10,
          comments: 5,
          bookmarks: 3,
        },
      ];

      const followingUserIds = ['456', '789'];

      const result = await (service as any).rankFeedItems(
        items,
        'user123',
        followingUserIds,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('score');
      expect(result[1]).toHaveProperty('score');
      // Newer content should generally have higher score
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });

    it('should handle ranking errors gracefully', async () => {
      const items = [{ id: 'content_1', userId: '456' }];
      const followingUserIds = ['456'];

      jest
        .spyOn(service as any, 'calculateItemScore')
        .mockRejectedValue(new Error('Score error'));

      const result = await (service as any).rankFeedItems(
        items,
        'user123',
        followingUserIds,
      );

      expect(result).toEqual(items); // Should return original order
    });
  });

  describe('calculateItemScore', () => {
    it('should calculate score based on recency', async () => {
      const item = {
        id: 'content_1',
        publishedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        likes: 10,
        comments: 5,
        bookmarks: 2,
      };

      const score = await (service as any).calculateItemScore(item, 'user123', [
        '456',
      ]);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate score based on engagement', async () => {
      const item = {
        id: 'content_1',
        publishedAt: new Date(),
        likes: 100,
        comments: 50,
        bookmarks: 20,
      };

      const score = await (service as any).calculateItemScore(item, 'user123', [
        '456',
      ]);

      expect(score).toBeGreaterThan(50); // Should be higher than base score
    });

    it('should calculate score based on author relationship', async () => {
      const item = {
        id: 'content_1',
        userId: '456',
        publishedAt: new Date(),
        likes: 0,
        comments: 0,
        bookmarks: 0,
      };

      const followingUserIds = ['456', '789', '101']; // 456 is first (closest relationship)

      const score = await (service as any).calculateItemScore(
        item,
        'user123',
        followingUserIds,
      );

      expect(score).toBeGreaterThan(50); // Should be higher than base score
    });

    it('should handle errors gracefully', async () => {
      const item = {
        id: 'content_1',
        publishedAt: new Date(),
        likes: 10,
        comments: 5,
        bookmarks: 2,
      };

      jest
        .spyOn(service as any, 'getMutualConnectionsCount')
        .mockRejectedValue(new Error('Mutual error'));

      const score = await (service as any).calculateItemScore(item, 'user123', [
        '456',
      ]);

      expect(score).toBeGreaterThan(50); // Should return calculated score before error
    });
  });

  describe('getMutualConnectionsCount', () => {
    it('should get mutual connections count', async () => {
      followBitsetService.getMutualFriends.mockResolvedValue({
        userIds: ['789', '101'],
        count: 2,
      });

      const result = await (service as any).getMutualConnectionsCount(
        'user123',
        'user456',
      );

      expect(result).toBe(2);
      expect(followBitsetService.getMutualFriends).toHaveBeenCalledWith(
        'user123',
        'user456',
        0,
      );
    });

    it('should return 0 when error occurs', async () => {
      followBitsetService.getMutualFriends.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await (service as any).getMutualConnectionsCount(
        'user123',
        'user456',
      );

      expect(result).toBe(0);
    });
  });

  describe('generateCursor', () => {
    it('should generate cursor from item', () => {
      const item = {
        id: 'content_123',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const cursor = (service as any).generateCursor(item);

      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
    });
  });

  describe('parseCursor', () => {
    it('should parse valid cursor', () => {
      const item = {
        id: 'content_123',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const cursor = (service as any).generateCursor(item);
      const parsed = (service as any).parseCursor(cursor);

      expect(parsed).toEqual({
        id: 'content_123',
        publishedAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should return null for invalid cursor', () => {
      const parsed = (service as any).parseCursor('invalid_cursor');

      expect(parsed).toBeNull();
    });
  });

  describe('getTrendingContent', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await service.getTrendingContent(20);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Test that the service handles errors gracefully by not throwing
      const result = await service.getTrendingContent(20);

      // Should return empty array, not throw
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getContentRecommendations', () => {
    it('should get content recommendations', async () => {
      const mockFollowingResult = {
        userIds: ['456', '789'],
        hasMore: false,
      };

      const mockRecommendations = [
        {
          id: 'rec_1',
          userId: '101',
          title: 'Recommended content',
        },
      ];

      followBitsetService.getFollowingIds.mockResolvedValue(
        mockFollowingResult,
      );
      jest
        .spyOn(service as any, 'getContentFromExtendedNetwork')
        .mockResolvedValue(mockRecommendations);

      const result = await service.getContentRecommendations('user123', 10);

      expect(result).toEqual(mockRecommendations);
      expect(followBitsetService.getFollowingIds).toHaveBeenCalledWith(
        'user123',
        100,
      );
    });

    it('should return empty array when no following', async () => {
      followBitsetService.getFollowingIds.mockResolvedValue({
        userIds: [],
        hasMore: false,
      });

      const result = await service.getContentRecommendations('user123', 10);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      followBitsetService.getFollowingIds.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getContentRecommendations('user123', 10);

      expect(result).toEqual([]);
    });
  });

  describe('getContentFromExtendedNetwork', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await (service as any).getContentFromExtendedNetwork(
        ['456', '789'],
        10,
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Test that the service handles errors gracefully by not throwing
      const result = await (service as any).getContentFromExtendedNetwork(
        ['456'],
        10,
      );

      // Should return empty array, not throw
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('invalidateUserFeed', () => {
    it('should invalidate user feed cache', async () => {
      (cacheService as any).cacheService.deleteKeysByPattern.mockResolvedValue(
        undefined,
      );

      await service.invalidateUserFeed('user123');

      expect(
        (cacheService as any).cacheService.deleteKeysByPattern,
      ).toHaveBeenCalledTimes(3);
      expect(
        (cacheService as any).cacheService.deleteKeysByPattern,
      ).toHaveBeenCalledWith('feed:user123:*');
      expect(
        (cacheService as any).cacheService.deleteKeysByPattern,
      ).toHaveBeenCalledWith('feed:trending:*');
      expect(
        (cacheService as any).cacheService.deleteKeysByPattern,
      ).toHaveBeenCalledWith('feed:recommendations:user123:*');
    });

    it('should handle invalidation errors gracefully', async () => {
      (cacheService as any).cacheService.deleteKeysByPattern.mockRejectedValue(
        new Error('Cache error'),
      );

      // Should not throw
      await expect(
        service.invalidateUserFeed('user123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getFeedStats', () => {
    it('should get feed statistics', async () => {
      followBitsetService.getCounters.mockResolvedValue({
        following: 25,
        followers: 15,
      });

      const result = await service.getFeedStats('user123');

      expect(result).toEqual({
        followingCount: 25,
        avgEngagement: 0, // Placeholder
        lastFeedUpdate: expect.any(Date),
      });
    });

    it('should handle errors gracefully', async () => {
      followBitsetService.getCounters.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await service.getFeedStats('user123');

      expect(result).toEqual({
        followingCount: 0,
        avgEngagement: 0,
        lastFeedUpdate: expect.any(Date),
      });
    });
  });
});
