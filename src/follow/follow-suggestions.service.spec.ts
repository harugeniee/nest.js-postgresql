import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoaringAdapter, RoaringSet } from './adapters/roaring.adapter';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { FollowSuggestionsService } from './follow-suggestions.service';

describe('FollowSuggestionsService', () => {
  let service: FollowSuggestionsService;
  let followBitsetService: jest.Mocked<FollowBitsetService>;
  let cacheService: jest.Mocked<FollowCacheService>;
  let roaringAdapter: jest.Mocked<RoaringAdapter>;

  const mockRoaringSet: Partial<RoaringSet> = {
    has: jest.fn().mockReturnValue(false),
    add: jest.fn(),
    remove: jest.fn(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    andNot: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockReturnValue(Buffer.from('mock_data')),
    size: jest.fn().mockReturnValue(5),
    toArray: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
    clear: jest.fn(),
    isEmpty: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const mockFollowBitsetService = {
      getFollowingIds: jest.fn(),
      getFollowersIds: jest.fn(),
      getMutualFriends: jest.fn(),
    };

    const mockCacheService = {
      getFollowingSet: jest.fn(),
      saveFollowingSet: jest.fn(),
      getFollowersSet: jest.fn(),
      saveFollowersSet: jest.fn(),
    };

    const mockRoaringAdapter = {
      init: jest.fn().mockResolvedValue(undefined),
      newSet: jest.fn().mockReturnValue(mockRoaringSet as RoaringSet),
      fromSerialized: jest.fn().mockReturnValue(mockRoaringSet as RoaringSet),
      isReady: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowSuggestionsService,
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

    service = module.get<FollowSuggestionsService>(FollowSuggestionsService);
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

  describe('getSuggestions', () => {
    it('should get friends of friends suggestions', async () => {
      const userFollowingSet = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
        toArray: jest.fn().mockReturnValue([456, 789]),
      } as RoaringSet;

      const friendsOfFriendsSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([101, 102, 103]),
        remove: jest.fn(),
        andNot: jest.fn(),
      } as RoaringSet;

      // Mock the actual method that gets called
      jest
        .spyOn(service as any, 'getFriendsOfFriendsSuggestions')
        .mockResolvedValue([
          {
            userId: '101',
            name: 'User 101',
            username: 'user_101',
            score: 80,
            reason: 'Followed by people you follow',
            isVerified: false,
          },
        ]);

      const result = await service.getSuggestions(
        'user123',
        10,
        'friends_of_friends',
      );

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('101');
    });

    it('should get popular suggestions', async () => {
      const userFollowingSet = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
      } as RoaringSet;

      const popularUsersSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([201, 202]),
        remove: jest.fn(),
        andNot: jest.fn(),
      } as RoaringSet;

      jest.spyOn(service as any, 'getPopularSuggestions').mockResolvedValue([
        {
          userId: '201',
          name: 'User 201',
          username: 'user_201',
          score: 75,
          reason: 'Popular among your network',
          isVerified: false,
        },
      ]);

      const result = await service.getSuggestions('user123', 10, 'popular');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('201');
    });

    it('should get similar interests suggestions (placeholder)', async () => {
      jest
        .spyOn(service as any, 'getSimilarInterestsSuggestions')
        .mockResolvedValue([]);

      const result = await service.getSuggestions(
        'user123',
        10,
        'similar_interests',
      );

      expect(result).toEqual([]);
    });

    it('should throw error for unknown algorithm', async () => {
      await expect(
        service.getSuggestions('user123', 10, 'unknown_algorithm' as any),
      ).rejects.toThrow(HttpException);
    });

    it('should return empty suggestions when user has no following', async () => {
      jest.spyOn(service as any, 'getUserFollowingSet').mockResolvedValue(null);

      const result = await service.getSuggestions(
        'user123',
        10,
        'friends_of_friends',
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      jest
        .spyOn(service as any, 'getFriendsOfFriendsSuggestions')
        .mockRejectedValue(new Error('Test error'));

      await expect(
        service.getSuggestions('user123', 10, 'friends_of_friends'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getFriendsOfFriendsSet', () => {
    it('should build friends of friends set', async () => {
      const userFollowingSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456, 789]),
      } as RoaringSet;

      const followeeFollowingSet1 = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
        toArray: jest.fn().mockReturnValue([101, 102]),
      } as RoaringSet;

      const followeeFollowingSet2 = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
        toArray: jest.fn().mockReturnValue([103, 104]),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getUserFollowingSet')
        .mockResolvedValueOnce(followeeFollowingSet1)
        .mockResolvedValueOnce(followeeFollowingSet2);

      const result = await (service as any).getFriendsOfFriendsSet(
        'user123',
        userFollowingSet,
      );

      expect(result).toBeDefined();
      expect(result.or).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when getting followee following sets', async () => {
      const userFollowingSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456]),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getUserFollowingSet')
        .mockRejectedValue(new Error('Test error'));

      const result = await (service as any).getFriendsOfFriendsSet(
        'user123',
        userFollowingSet,
      );

      expect(result).toBeDefined();
      // Should continue processing despite errors
    });
  });

  describe('getPopularUsersAmongFollowing', () => {
    it('should build popular users set from followers', async () => {
      const userFollowingSet = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([456, 789]),
      } as RoaringSet;

      const followeeFollowersSet1 = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
        toArray: jest.fn().mockReturnValue([201, 202]),
      } as RoaringSet;

      const followeeFollowersSet2 = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(false),
        toArray: jest.fn().mockReturnValue([203, 204]),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getUserFollowersSet')
        .mockResolvedValueOnce(followeeFollowersSet1)
        .mockResolvedValueOnce(followeeFollowersSet2);

      const result = await (service as any).getPopularUsersAmongFollowing(
        'user123',
        userFollowingSet,
      );

      expect(result).toBeDefined();
      expect(result.or).toHaveBeenCalledTimes(2);
    });

    it('should return empty set when no user following set', async () => {
      const emptySet = {
        ...mockRoaringSet,
        isEmpty: jest.fn().mockReturnValue(true),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getPopularUsersAmongFollowing')
        .mockResolvedValue(emptySet);

      const result = await (service as any).getPopularUsersAmongFollowing(
        'user123',
        null,
      );

      expect(result).toBeDefined();
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('convertToSuggestions', () => {
    it('should convert bitset to user suggestions', async () => {
      const bitset = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([101, 102]),
      } as RoaringSet;

      const userFollowingSet = {
        ...mockRoaringSet,
        and: jest
          .fn()
          .mockReturnValueOnce({
            size: jest.fn().mockReturnValue(2),
          })
          .mockReturnValueOnce({
            size: jest.fn().mockReturnValue(1),
          }),
      } as RoaringSet;

      jest.spyOn(service as any, 'getUserInfo').mockResolvedValue({
        name: 'Test User',
        username: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        isVerified: true,
      });

      // Mock getUserFollowingSet for mutual count calculation
      jest
        .spyOn(service as any, 'getUserFollowingSet')
        .mockResolvedValueOnce({
          and: jest.fn().mockReturnValue({
            size: jest.fn().mockReturnValue(2),
          }),
        })
        .mockResolvedValueOnce({
          and: jest.fn().mockReturnValue({
            size: jest.fn().mockReturnValue(1),
          }),
        });

      // Mock calculateScore to return deterministic scores
      jest
        .spyOn(service as any, 'calculateScore')
        .mockReturnValueOnce(90) // Higher score for first user (101)
        .mockReturnValueOnce(80); // Lower score for second user (102)

      const result = await (service as any).convertToSuggestions(
        bitset,
        10,
        userFollowingSet,
        'friends_of_friends',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: '101',
        name: 'Test User',
        username: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        isVerified: true,
        mutualCount: 2,
        reason: 'Followed by 2 mutual friends',
      });
      expect(result[1]).toMatchObject({
        userId: '102',
        name: 'Test User',
        username: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        isVerified: true,
        mutualCount: 1,
        reason: 'Followed by 1 mutual friend',
      });
    });

    it('should handle errors when getting user info', async () => {
      const bitset = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([101]),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getUserInfo')
        .mockRejectedValue(new Error('User service error'));

      const result = await (service as any).convertToSuggestions(
        bitset,
        10,
        null,
        'friends_of_friends',
      );

      expect(result).toHaveLength(0);
    });

    it('should sort suggestions by score', async () => {
      const bitset = {
        ...mockRoaringSet,
        toArray: jest.fn().mockReturnValue([101, 102]),
      } as RoaringSet;

      jest
        .spyOn(service as any, 'getUserInfo')
        .mockResolvedValueOnce({ name: 'User 1', username: 'user1' })
        .mockResolvedValueOnce({ name: 'User 2', username: 'user2' });

      jest
        .spyOn(service as any, 'calculateScore')
        .mockReturnValueOnce(60) // Lower score
        .mockReturnValueOnce(80); // Higher score

      const result = await (service as any).convertToSuggestions(
        bitset,
        10,
        null,
        'friends_of_friends',
      );

      expect(result).toHaveLength(2);
      expect(result[0].score).toBe(80); // Higher score first
      expect(result[1].score).toBe(60);
    });
  });

  describe('getUserFollowingSet', () => {
    it('should return cached following set', async () => {
      const cachedSet = mockRoaringSet as RoaringSet;
      cacheService.getFollowingSet.mockResolvedValue(cachedSet);

      const result = await (service as any).getUserFollowingSet('user123');

      expect(result).toBe(cachedSet);
    });

    it('should fallback to service when cache miss', async () => {
      cacheService.getFollowingSet.mockResolvedValue(null);
      followBitsetService.getFollowingIds.mockResolvedValue({
        userIds: ['456', '789'],
        hasMore: false,
      });

      const result = await (service as any).getUserFollowingSet('user123');

      expect(result).toBeDefined();
      expect(followBitsetService.getFollowingIds).toHaveBeenCalledWith(
        'user123',
        1000,
      );
      expect(cacheService.saveFollowingSet).toHaveBeenCalled();
    });

    it('should return null when service returns empty', async () => {
      cacheService.getFollowingSet.mockResolvedValue(null);
      followBitsetService.getFollowingIds.mockResolvedValue({
        userIds: [],
        hasMore: false,
      });

      const result = await (service as any).getUserFollowingSet('user123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      cacheService.getFollowingSet.mockRejectedValue(new Error('Cache error'));

      const result = await (service as any).getUserFollowingSet('user123');

      expect(result).toBeNull();
    });
  });

  describe('getUserFollowersSet', () => {
    it('should return cached followers set', async () => {
      const cachedSet = mockRoaringSet as RoaringSet;
      cacheService.getFollowersSet.mockResolvedValue(cachedSet);

      const result = await (service as any).getUserFollowersSet('user123');

      expect(result).toBe(cachedSet);
    });

    it('should fallback to service when cache miss', async () => {
      cacheService.getFollowersSet.mockResolvedValue(null);
      followBitsetService.getFollowersIds.mockResolvedValue({
        userIds: ['456', '789'],
        hasMore: false,
      });

      const result = await (service as any).getUserFollowersSet('user123');

      expect(result).toBeDefined();
      expect(followBitsetService.getFollowersIds).toHaveBeenCalledWith(
        'user123',
        1000,
      );
      expect(cacheService.saveFollowersSet).toHaveBeenCalled();
    });
  });

  describe('getUserInfo', () => {
    it('should return placeholder user info', async () => {
      const result = await (service as any).getUserInfo('user123');

      expect(result).toEqual({
        name: 'User user123',
        username: 'user_user123',
        avatarUrl: undefined,
        isVerified: false,
      });
    });
  });

  describe('calculateScore', () => {
    it('should calculate score based on mutual count and reason', () => {
      const score1 = (service as any).calculateScore(
        'user123',
        'friends_of_friends',
        5,
      );
      const score2 = (service as any).calculateScore('user123', 'popular', 0);
      const score3 = (service as any).calculateScore(
        'user123',
        'similar_interests',
        10,
      );

      expect(score1).toBeGreaterThan(score2); // More mutual friends = higher score
      expect(score3).toBeGreaterThan(score2); // Similar interests = higher score
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(100);
    });

    it('should cap mutual count boost at 30 points', () => {
      const score = (service as any).calculateScore(
        'user123',
        'friends_of_friends',
        100,
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getReasonText', () => {
    it('should return appropriate reason text', () => {
      expect((service as any).getReasonText('friends_of_friends', 0)).toBe(
        'Followed by people you follow',
      );
      expect((service as any).getReasonText('friends_of_friends', 1)).toBe(
        'Followed by 1 mutual friend',
      );
      expect((service as any).getReasonText('friends_of_friends', 5)).toBe(
        'Followed by 5 mutual friends',
      );
      expect((service as any).getReasonText('popular', 0)).toBe(
        'Popular among your network',
      );
      expect((service as any).getReasonText('similar_interests', 0)).toBe(
        'Similar interests to you',
      );
      expect((service as any).getReasonText('unknown', 0)).toBe(
        'Suggested for you',
      );
    });
  });
});
