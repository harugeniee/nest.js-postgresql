import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoaringAdapter, RoaringSet } from './adapters/roaring.adapter';
import { FollowCacheService } from './follow-cache.service';
import { UserFollowBitset } from './entities/user-follow-bitset.entity';
import { UserFollowEdge } from './entities/user-follow-edge.entity';
import { stringToNumberId, numberToStringId } from './utils/id-utils';

/**
 * FollowBitsetService - Core follow operations using roaring bitmap
 *
 * Handles follow/unfollow operations, mutual friends calculation,
 * and bitset persistence using the existing CacheService
 */
@Injectable()
export class FollowBitsetService {
  private readonly logger = new Logger(FollowBitsetService.name);

  constructor(
    @InjectRepository(UserFollowBitset)
    private readonly bitsetRepo: Repository<UserFollowBitset>,
    @InjectRepository(UserFollowEdge)
    private readonly edgeRepo: Repository<UserFollowEdge>,
    private readonly cacheService: FollowCacheService,
    @Inject('ROARING_ADAPTER') private readonly roaringAdapter: RoaringAdapter,
  ) {}

  /**
   * Follow a user
   * @param followerId Follower user ID
   * @param followeeId User to follow
   * @returns Follow result
   */
  async follow(
    followerId: string,
    followeeId: string,
  ): Promise<{ success: boolean; status: string }> {
    // Validation
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    try {
      // Acquire lock to prevent race conditions
      const lockAcquired = await this.cacheService.acquireLock(followerId);
      if (!lockAcquired) {
        throw new Error('Failed to acquire lock for follow operation');
      }

      try {
        // Get or create following bitset
        let followingSet = await this.getFollowingSet(followerId);
        followingSet ??= this.roaringAdapter.newSet();

        const followeeIdNum = stringToNumberId(followeeId);

        // Check if already following
        if (followingSet.has(followeeIdNum)) {
          this.logger.debug(`User ${followerId} already follows ${followeeId}`);
          return { success: true, status: 'already_following' };
        }

        // Add to bitset
        followingSet.add(followeeIdNum);

        // Save to cache
        await this.cacheService.saveFollowingSet(followerId, followingSet);

        // Update counters
        await Promise.all([
          this.cacheService.incrFollowing(followerId, 1),
          this.cacheService.incrFollowers(followeeId, 1),
        ]);

        // Create edge record for audit trail
        await this.createEdge(followerId, followeeId);

        // Enqueue persistence (would be handled by background task)
        this.enqueuePersistence(followerId);

        this.logger.log(`User ${followerId} followed ${followeeId}`);
        return { success: true, status: 'followed' };
      } finally {
        await this.cacheService.releaseLock(followerId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to follow user ${followeeId} by ${followerId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param followerId Follower user ID
   * @param followeeId User to unfollow
   * @returns Unfollow result
   */
  async unfollow(
    followerId: string,
    followeeId: string,
  ): Promise<{ success: boolean; status: string }> {
    try {
      // Acquire lock
      const lockAcquired = await this.cacheService.acquireLock(followerId);
      if (!lockAcquired) {
        throw new Error('Failed to acquire lock for unfollow operation');
      }

      try {
        // Get following bitset
        const followingSet = await this.getFollowingSet(followerId);
        if (!followingSet) {
          this.logger.debug(`User ${followerId} has no following set`);
          return { success: true, status: 'not_following' };
        }

        const followeeIdNum = stringToNumberId(followeeId);

        // Check if following
        if (!followingSet.has(followeeIdNum)) {
          this.logger.debug(
            `User ${followerId} is not following ${followeeId}`,
          );
          return { success: true, status: 'not_following' };
        }

        // Remove from bitset
        followingSet.remove(followeeIdNum);

        // Save to cache
        await this.cacheService.saveFollowingSet(followerId, followingSet);

        // Update counters
        await Promise.all([
          this.cacheService.decrFollowing(followerId, 1),
          this.cacheService.decrFollowers(followeeId, 1),
        ]);

        // Soft delete edge record
        await this.softDeleteEdge(followerId, followeeId);

        // Enqueue persistence
        this.enqueuePersistence(followerId);

        this.logger.log(`User ${followerId} unfollowed ${followeeId}`);
        return { success: true, status: 'unfollowed' };
      } finally {
        await this.cacheService.releaseLock(followerId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to unfollow user ${followeeId} by ${followerId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get following user IDs
   * @param userId User ID
   * @param limit Maximum number of IDs to return
   * @param cursor Pagination cursor
   * @returns Array of user IDs
   */
  async getFollowingIds(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{
    userIds: string[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      const followingSet = await this.getFollowingSet(userId);
      if (!followingSet) {
        return { userIds: [], hasMore: false };
      }

      const allIds = followingSet.toArray();
      const userIds = allIds.map(numberToStringId);

      // Simple cursor-based pagination
      let startIndex = 0;
      if (cursor) {
        const cursorIndex = userIds.indexOf(cursor);
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1;
        }
      }

      const paginatedIds = userIds.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < userIds.length;
      const nextCursor = hasMore
        ? paginatedIds[paginatedIds.length - 1]
        : undefined;

      return {
        userIds: paginatedIds,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get following IDs for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get followers user IDs
   * @param userId User ID
   * @param limit Maximum number of IDs to return
   * @param cursor Pagination cursor
   * @returns Array of user IDs
   */
  async getFollowersIds(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{
    userIds: string[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      const followersSet = await this.getFollowersSet(userId);
      if (!followersSet) {
        return { userIds: [], hasMore: false };
      }

      const allIds = followersSet.toArray();
      const userIds = allIds.map(numberToStringId);

      // Simple cursor-based pagination
      let startIndex = 0;
      if (cursor) {
        const cursorIndex = userIds.indexOf(cursor);
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1;
        }
      }

      const paginatedIds = userIds.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < userIds.length;
      const nextCursor = hasMore
        ? paginatedIds[paginatedIds.length - 1]
        : undefined;

      return {
        userIds: paginatedIds,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get followers IDs for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get mutual friends between two users
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @param limit Maximum number of mutual friends to return
   * @returns Array of mutual friend IDs
   */
  async getMutualFriends(
    userIdA: string,
    userIdB: string,
    limit: number = 20,
  ): Promise<{
    userIds: string[];
    count: number;
  }> {
    try {
      const [followingA, followingB] = await Promise.all([
        this.getFollowingSet(userIdA),
        this.getFollowingSet(userIdB),
      ]);

      if (!followingA || !followingB) {
        return { userIds: [], count: 0 };
      }

      // Calculate intersection
      const mutualSet = followingA.and(followingB);
      const mutualIds = mutualSet.toArray(limit).map(numberToStringId);

      return {
        userIds: mutualIds,
        count: mutualSet.size(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get mutual friends between ${userIdA} and ${userIdB}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get follow status between two users
   * @param followerId Follower user ID
   * @param followeeId Followee user ID
   * @returns Follow status
   */
  async getFollowStatus(
    followerId: string,
    followeeId: string,
  ): Promise<{
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
    mutualCount: number;
  }> {
    try {
      const [isFollowing, isFollowedBy, mutualResult] = await Promise.all([
        this.cacheService.isFollowing(followerId, followeeId),
        this.cacheService.isFollowing(followeeId, followerId),
        this.getMutualFriends(followerId, followeeId, 0),
      ]);

      const mutualCount = mutualResult.count;

      return {
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy,
        mutualCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get follow status between ${followerId} and ${followeeId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get follow counters
   * @param userId User ID
   * @returns Follow counters
   */
  async getCounters(
    userId: string,
  ): Promise<{ following: number; followers: number }> {
    try {
      const cached = await this.cacheService.getCounters(userId);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const bitset = await this.bitsetRepo.findOne({ where: { userId } });
      if (!bitset) {
        return { following: 0, followers: 0 };
      }

      const counters = {
        following: bitset.followingCount,
        followers: bitset.followerCount,
      };

      // Cache the result
      await this.cacheService.setCounters(
        userId,
        counters.following,
        counters.followers,
      );

      return counters;
    } catch (error) {
      this.logger.error(`Failed to get counters for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export bitset data
   * @param userId User ID
   * @param type Type of bitset to export
   * @returns Base64 encoded bitset data
   */
  async exportBitset(
    userId: string,
    type: 'following' | 'followers',
  ): Promise<{
    data: string;
    count: number;
    exportedAt: Date;
  }> {
    try {
      const set =
        type === 'following'
          ? await this.getFollowingSet(userId)
          : await this.getFollowersSet(userId);

      if (!set) {
        throw new NotFoundException(
          `${type} bitset not found for user ${userId}`,
        );
      }

      const buffer = set.toBuffer();
      const data = buffer.toString('base64');
      const count = set.size();

      return {
        data,
        count,
        exportedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to export ${type} bitset for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Import bitset data
   * @param userId User ID
   * @param data Base64 encoded bitset data
   * @param type Type of bitset to import
   * @param replace Whether to replace existing data
   */
  async importBitset(
    userId: string,
    data: string,
    type: 'following' | 'followers',
    replace: boolean = false,
  ): Promise<{ success: boolean; count: number }> {
    try {
      const buffer = Buffer.from(data, 'base64');
      const set = this.roaringAdapter.fromSerialized(buffer);
      const count = set.size();

      if (type === 'following') {
        await this.cacheService.saveFollowingSet(userId, set);
        await this.cacheService.incrFollowing(userId, count);
      } else {
        await this.cacheService.saveFollowersSet(userId, set);
        await this.cacheService.incrFollowers(userId, count);
      }

      this.logger.log(
        `Imported ${type} bitset for user ${userId}: ${count} items`,
      );
      return { success: true, count };
    } catch (error) {
      this.logger.error(
        `Failed to import ${type} bitset for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Rebuild bitset from edges
   * @param userId User ID
   * @param force Whether to force rebuild
   */
  async rebuildFromEdges(
    userId: string,
    force: boolean = false,
  ): Promise<{ success: boolean; count: number }> {
    try {
      // Check if rebuild is needed
      const existing = await this.bitsetRepo.findOne({ where: { userId } });
      if (existing && !existing.needsRebuild() && !force) {
        this.logger.debug(`Rebuild not needed for user ${userId}`);
        return { success: true, count: existing.followingCount };
      }

      // Get active edges
      const edges = await this.edgeRepo.find({
        where: [
          { followerId: userId, status: 'active' },
          { followeeId: userId, status: 'active' },
        ],
      });

      // Build bitsets
      const followingSet = this.roaringAdapter.newSet();
      const followersSet = this.roaringAdapter.newSet();

      for (const edge of edges) {
        if (edge.followerId === userId) {
          const followeeIdNum = stringToNumberId(edge.followeeId);
          followingSet.add(followeeIdNum);
        } else {
          const followerIdNum = stringToNumberId(edge.followerId);
          followersSet.add(followerIdNum);
        }
      }

      // Save to cache
      await Promise.all([
        this.cacheService.saveFollowingSet(userId, followingSet),
        this.cacheService.saveFollowersSet(userId, followersSet),
      ]);

      // Update counters
      await this.cacheService.setCounters(
        userId,
        followingSet.size(),
        followersSet.size(),
      );

      // Update database
      await this.upsertBitset(userId, followingSet, followersSet);

      this.logger.log(
        `Rebuilt bitsets for user ${userId}: following=${followingSet.size()}, followers=${followersSet.size()}`,
      );
      return { success: true, count: followingSet.size() };
    } catch (error) {
      this.logger.error(`Failed to rebuild bitset for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get following bitset from cache or database
   * @param userId User ID
   * @returns RoaringSet or null
   */
  private async getFollowingSet(userId: string): Promise<RoaringSet | null> {
    // Try cache first
    const cached = await this.cacheService.getFollowingSet(userId);
    if (cached) return cached;

    // Fallback to database
    const bitset = await this.bitsetRepo.findOne({ where: { userId } });
    if (!bitset?.followingRb) return null;

    const set = this.roaringAdapter.fromSerialized(bitset.followingRb);

    // Cache the result
    await this.cacheService.saveFollowingSet(userId, set);

    return set;
  }

  /**
   * Get followers bitset from cache or database
   * @param userId User ID
   * @returns RoaringSet or null
   */
  private async getFollowersSet(userId: string): Promise<RoaringSet | null> {
    // Try cache first
    const cached = await this.cacheService.getFollowersSet(userId);
    if (cached) return cached;

    // Fallback to database
    const bitset = await this.bitsetRepo.findOne({ where: { userId } });
    if (!bitset?.followersRb) return null;

    const set = this.roaringAdapter.fromSerialized(bitset.followersRb);

    // Cache the result
    await this.cacheService.saveFollowersSet(userId, set);

    return set;
  }

  /**
   * Create edge record
   * @param followerId Follower user ID
   * @param followeeId Followee user ID
   */
  private async createEdge(
    followerId: string,
    followeeId: string,
  ): Promise<void> {
    try {
      const edge = this.edgeRepo.create({
        followerId,
        followeeId,
        status: 'active',
        source: 'user',
      });
      await this.edgeRepo.save(edge);
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('duplicate key')) {
        this.logger.error(
          `Failed to create edge ${followerId} -> ${followeeId}:`,
          error,
        );
      }
    }
  }

  /**
   * Soft delete edge record
   * @param followerId Follower user ID
   * @param followeeId Followee user ID
   */
  private async softDeleteEdge(
    followerId: string,
    followeeId: string,
  ): Promise<void> {
    try {
      await this.edgeRepo.update(
        { followerId, followeeId },
        { status: 'deleted', deletedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(
        `Failed to soft delete edge ${followerId} -> ${followeeId}:`,
        error,
      );
    }
  }

  /**
   * Upsert bitset record
   * @param userId User ID
   * @param followingSet Following bitset
   * @param followersSet Followers bitset
   */
  private async upsertBitset(
    userId: string,
    followingSet: RoaringSet,
    followersSet: RoaringSet,
  ): Promise<void> {
    try {
      const bitset = this.bitsetRepo.create({
        userId,
        followingCount: followingSet.size(),
        followerCount: followersSet.size(),
        followingRb: followingSet.toBuffer(),
        followersRb: followersSet.toBuffer(),
        lastRebuildAt: new Date(),
        version: 1,
      });

      await this.bitsetRepo.upsert(bitset, ['userId']);
    } catch (error) {
      this.logger.error(`Failed to upsert bitset for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Enqueue persistence task
   * @param userId User ID
   */
  private enqueuePersistence(userId: string): void {
    // This would be handled by a background task/queue
    // For now, just log
    this.logger.debug(`Enqueued persistence for user ${userId}`);
  }
}
