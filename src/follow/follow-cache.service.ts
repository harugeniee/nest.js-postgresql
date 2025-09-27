import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../shared/services/cache/cache.service';
import { RoaringSet } from './adapters/roaring.adapter';
import { stringToNumberId, numberToStringId } from './utils/id-utils';

/**
 * FollowCacheService - Redis cache operations for follow system
 *
 * Uses the existing CacheService for Redis operations
 * Provides specialized methods for follow bitset caching
 */
@Injectable()
export class FollowCacheService {
  private readonly logger = new Logger(FollowCacheService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly LOCK_TTL = 30; // 30 seconds

  // Redis key patterns
  private readonly KEYS = {
    FOLLOWING: (userId: string) => `follow:rb:following:${userId}`,
    FOLLOWERS: (userId: string) => `follow:rb:followers:${userId}`,
    COUNTER_FOLLOWING: (userId: string) => `follow:cnt:ing:${userId}`,
    COUNTER_FOLLOWERS: (userId: string) => `follow:cnt:ers:${userId}`,
    LOCK: (userId: string) => `follow:lock:${userId}`,
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get following bitset from cache
   * @param userId User ID
   * @returns RoaringSet or null if not cached
   */
  async getFollowingSet(userId: string): Promise<RoaringSet | null> {
    try {
      const key = this.KEYS.FOLLOWING(userId);
      const cached = await this.cacheService.get<Buffer>(key);

      if (!cached) {
        this.logger.debug(`Cache miss for following set: ${userId}`);
        return null;
      }

      this.logger.debug(`Cache hit for following set: ${userId}`);
      // Note: This would need to be deserialized by the roaring adapter
      // For now, return null as we need the adapter to deserialize
      // TODO: Implement proper deserialization using roaring adapter
      // This is a placeholder implementation that always returns null
      // In a real implementation, this would deserialize the cached buffer
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get following set for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Save following bitset to cache
   * @param userId User ID
   * @param set RoaringSet to cache
   */
  async saveFollowingSet(userId: string, set: RoaringSet): Promise<void> {
    try {
      const key = this.KEYS.FOLLOWING(userId);
      const serialized = set.toBuffer();

      await this.cacheService.set(key, serialized, this.CACHE_TTL);
      this.logger.debug(`Cached following set for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save following set for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get followers bitset from cache
   * @param userId User ID
   * @returns RoaringSet or null if not cached
   */
  async getFollowersSet(userId: string): Promise<RoaringSet | null> {
    try {
      const key = this.KEYS.FOLLOWERS(userId);
      const cached = await this.cacheService.get<Buffer>(key);

      if (!cached) {
        this.logger.debug(`Cache miss for followers set: ${userId}`);
        return null;
      }

      this.logger.debug(`Cache hit for followers set: ${userId}`);
      // TODO: Implement proper deserialization using roaring adapter
      // This is a placeholder implementation that always returns null
      // In a real implementation, this would deserialize the cached buffer
      return null; // Would need adapter to deserialize
    } catch (error) {
      this.logger.error(
        `Failed to get followers set for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Save followers bitset to cache
   * @param userId User ID
   * @param set RoaringSet to cache
   */
  async saveFollowersSet(userId: string, set: RoaringSet): Promise<void> {
    try {
      const key = this.KEYS.FOLLOWERS(userId);
      const serialized = set.toBuffer();

      await this.cacheService.set(key, serialized, this.CACHE_TTL);
      this.logger.debug(`Cached followers set for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to save followers set for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get follow counters from cache
   * @param userId User ID
   * @returns Object with following and followers count
   */
  async getCounters(
    userId: string,
  ): Promise<{ following: number; followers: number } | null> {
    try {
      const [following, followers] = await Promise.all([
        this.cacheService.get<number>(this.KEYS.COUNTER_FOLLOWING(userId)),
        this.cacheService.get<number>(this.KEYS.COUNTER_FOLLOWERS(userId)),
      ]);

      if (following === null || followers === null) {
        this.logger.debug(`Cache miss for counters: ${userId}`);
        return null;
      }

      return { following, followers };
    } catch (error) {
      this.logger.error(`Failed to get counters for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Set follow counters in cache
   * @param userId User ID
   * @param following Following count
   * @param followers Followers count
   */
  async setCounters(
    userId: string,
    following: number,
    followers: number,
  ): Promise<void> {
    try {
      await Promise.all([
        this.cacheService.set(
          this.KEYS.COUNTER_FOLLOWING(userId),
          following,
          this.CACHE_TTL,
        ),
        this.cacheService.set(
          this.KEYS.COUNTER_FOLLOWERS(userId),
          followers,
          this.CACHE_TTL,
        ),
      ]);

      this.logger.debug(
        `Cached counters for user: ${userId} (following: ${following}, followers: ${followers})`,
      );
    } catch (error) {
      this.logger.error(`Failed to set counters for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Increment following count
   * @param userId User ID
   * @param delta Increment amount (default: 1)
   */
  async incrFollowing(userId: string, delta: number = 1): Promise<number> {
    try {
      const key = this.KEYS.COUNTER_FOLLOWING(userId);
      const redis = this.cacheService.getRedisClient();
      const newValue = await redis.incrby(key, delta);

      // Set expiration if this is a new key
      if (newValue === delta) {
        await redis.expire(key, this.CACHE_TTL);
      }

      this.logger.debug(
        `Incremented following count for user ${userId}: +${delta} = ${newValue}`,
      );
      return newValue;
    } catch (error) {
      this.logger.error(
        `Failed to increment following count for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Increment followers count
   * @param userId User ID
   * @param delta Increment amount (default: 1)
   */
  async incrFollowers(userId: string, delta: number = 1): Promise<number> {
    try {
      const key = this.KEYS.COUNTER_FOLLOWERS(userId);
      const redis = this.cacheService.getRedisClient();
      const newValue = await redis.incrby(key, delta);

      // Set expiration if this is a new key
      if (newValue === delta) {
        await redis.expire(key, this.CACHE_TTL);
      }

      this.logger.debug(
        `Incremented followers count for user ${userId}: +${delta} = ${newValue}`,
      );
      return newValue;
    } catch (error) {
      this.logger.error(
        `Failed to increment followers count for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Decrement following count
   * @param userId User ID
   * @param delta Decrement amount (default: 1)
   */
  async decrFollowing(userId: string, delta: number = 1): Promise<number> {
    try {
      const key = this.KEYS.COUNTER_FOLLOWING(userId);
      const redis = this.cacheService.getRedisClient();
      const newValue = await redis.incrby(key, -delta);

      this.logger.debug(
        `Decremented following count for user ${userId}: -${delta} = ${newValue}`,
      );
      return newValue;
    } catch (error) {
      this.logger.error(
        `Failed to decrement following count for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Decrement followers count
   * @param userId User ID
   * @param delta Decrement amount (default: 1)
   */
  async decrFollowers(userId: string, delta: number = 1): Promise<number> {
    try {
      const key = this.KEYS.COUNTER_FOLLOWERS(userId);
      const redis = this.cacheService.getRedisClient();
      const newValue = await redis.incrby(key, -delta);

      this.logger.debug(
        `Decremented followers count for user ${userId}: -${delta} = ${newValue}`,
      );
      return newValue;
    } catch (error) {
      this.logger.error(
        `Failed to decrement followers count for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Acquire lock for user operations
   * @param userId User ID
   * @returns True if lock acquired, false if already locked
   */
  async acquireLock(userId: string): Promise<boolean> {
    try {
      const lockKey = this.KEYS.LOCK(userId);
      return await this.cacheService.setLock(lockKey, this.LOCK_TTL);
    } catch (error) {
      this.logger.error(`Failed to acquire lock for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Release lock for user operations
   * @param userId User ID
   */
  async releaseLock(userId: string): Promise<void> {
    try {
      const lockKey = this.KEYS.LOCK(userId);
      await this.cacheService.releaseLock(lockKey);
    } catch (error) {
      this.logger.error(`Failed to release lock for user ${userId}:`, error);
    }
  }

  /**
   * Invalidate all cache entries for a user
   * @param userId User ID
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const patterns = [
        this.KEYS.FOLLOWING(userId),
        this.KEYS.FOLLOWERS(userId),
        this.KEYS.COUNTER_FOLLOWING(userId),
        this.KEYS.COUNTER_FOLLOWERS(userId),
        this.KEYS.LOCK(userId),
      ];

      await Promise.all(patterns.map((key) => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated all cache entries for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Invalidate follow-related cache for multiple users
   * @param userIds Array of user IDs
   */
  async invalidateUsers(userIds: string[]): Promise<void> {
    try {
      const patterns = userIds.flatMap((userId) => [
        this.KEYS.FOLLOWING(userId),
        this.KEYS.FOLLOWERS(userId),
        this.KEYS.COUNTER_FOLLOWING(userId),
        this.KEYS.COUNTER_FOLLOWERS(userId),
      ]);

      await Promise.all(patterns.map((key) => this.cacheService.delete(key)));
      this.logger.debug(`Invalidated cache for ${userIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for users:`, error);
      throw error;
    }
  }

  /**
   * Get following user IDs from cache
   * @param userId User ID
   * @param limit Maximum number of IDs to return
   * @returns Array of user IDs or null if not cached
   */
  async getFollowingIds(
    userId: string,
    limit?: number,
  ): Promise<string[] | null> {
    try {
      const set = await this.getFollowingSet(userId);
      if (!set) return null;

      const ids = set.toArray(limit);
      return ids.map(numberToStringId);
    } catch (error) {
      this.logger.error(
        `Failed to get following IDs for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get followers user IDs from cache
   * @param userId User ID
   * @param limit Maximum number of IDs to return
   * @returns Array of user IDs or null if not cached
   */
  async getFollowersIds(
    userId: string,
    limit?: number,
  ): Promise<string[] | null> {
    try {
      const set = await this.getFollowersSet(userId);
      if (!set) return null;

      const ids = set.toArray(limit);
      return ids.map(numberToStringId);
    } catch (error) {
      this.logger.error(
        `Failed to get followers IDs for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Check if user A follows user B
   * @param followerId Follower user ID
   * @param followeeId Followee user ID
   * @returns True if following, false otherwise
   */
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    try {
      const set = await this.getFollowingSet(followerId);
      if (!set) return false;

      const followeeIdNum = stringToNumberId(followeeId);
      return set.has(followeeIdNum);
    } catch (error) {
      this.logger.error(
        `Failed to check follow status: ${followerId} -> ${followeeId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  async getCacheStats(): Promise<{
    followingKeys: number;
    followersKeys: number;
    counterKeys: number;
    lockKeys: number;
  }> {
    try {
      const [followingKeys, followersKeys, counterKeys, lockKeys] =
        await Promise.all([
          this.cacheService.countKeysByPattern('follow:rb:following:*'),
          this.cacheService.countKeysByPattern('follow:rb:followers:*'),
          this.cacheService.countKeysByPattern('follow:cnt:*'),
          this.cacheService.countKeysByPattern('follow:lock:*'),
        ]);

      return {
        followingKeys,
        followersKeys,
        counterKeys,
        lockKeys,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        followingKeys: 0,
        followersKeys: 0,
        counterKeys: 0,
        lockKeys: 0,
      };
    }
  }
}
