import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { RoaringAdapter } from './adapters/roaring.adapter';

/**
 * NewsFeedService - Generate news feed using follow relationships
 *
 * This is a skeleton implementation that would integrate with
 * the existing articles/content system to generate personalized feeds
 */
@Injectable()
export class NewsFeedService {
  private readonly logger = new Logger(NewsFeedService.name);

  constructor(
    private readonly followBitsetService: FollowBitsetService,
    private readonly cacheService: FollowCacheService,
    @Inject('BITSET_ADAPTER') private readonly roaringAdapter: RoaringAdapter,
  ) {}

  /**
   * Generate user's news feed
   * @param userId User ID
   * @param limit Maximum number of items
   * @param cursor Pagination cursor
   * @returns News feed items
   */
  async generateUserFeed(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{
    items: any[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Generating news feed for user ${userId}`);

      // Get following users
      const followingResult = await this.followBitsetService.getFollowingIds(
        userId,
        1000,
      );
      const followingUserIds = followingResult.userIds;

      if (followingUserIds.length === 0) {
        this.logger.debug(
          `User ${userId} has no following, returning empty feed`,
        );
        return { items: [], hasMore: false };
      }

      // Get content from followed users
      const feedItems = await this.getContentFromUsers(
        followingUserIds,
        limit,
        cursor,
      );

      // Apply ranking algorithm
      const rankedItems = await this.rankFeedItems(
        feedItems,
        userId,
        followingUserIds,
      );

      // Generate next cursor
      const nextCursor =
        rankedItems.length > 0
          ? this.generateCursor(rankedItems[rankedItems.length - 1])
          : undefined;

      this.logger.debug(
        `Generated ${rankedItems.length} feed items for user ${userId}`,
      );

      return {
        items: rankedItems,
        nextCursor,
        hasMore: rankedItems.length === limit,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to generate news feed for user ${userId}:`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { messageKey: 'follow.GENERATE_FEED_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get content from followed users
   * @param userIds Array of user IDs
   * @param limit Maximum number of items
   * @param cursor Pagination cursor
   * @returns Array of content items
   */
  private async getContentFromUsers(
    userIds: string[],
    limit: number,
    cursor?: string,
  ): Promise<any[]> {
    try {
      // This is a placeholder implementation
      // In a real system, this would query the articles/content service
      // with the user IDs and apply proper filtering, pagination, etc.

      this.logger.debug(`Getting content from ${userIds.length} users`);

      // Mock data for demonstration
      const mockItems = userIds.slice(0, limit).map((userId, index) => ({
        id: `content_${userId}_${index}`,
        userId,
        title: `Article from User ${userId}`,
        content: `This is content from user ${userId}`,
        publishedAt: new Date(Date.now() - index * 1000 * 60 * 60), // 1 hour apart
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50),
        bookmarks: Math.floor(Math.random() * 20),
      }));

      return mockItems;
    } catch (error: any) {
      this.logger.error('Failed to get content from users:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Return empty array for non-critical errors
      return [];
    }
  }

  /**
   * Rank feed items based on various factors
   * @param items Array of content items
   * @param userId User ID
   * @param followingUserIds Array of followed user IDs
   * @returns Ranked array of items
   */
  private async rankFeedItems(
    items: any[],
    userId: string,
    followingUserIds: string[],
  ): Promise<any[]> {
    try {
      // Calculate engagement score for each item
      const rankedItems = await Promise.all(
        items.map(async (item) => {
          const score = await this.calculateItemScore(
            item,
            userId,
            followingUserIds,
          );
          return { ...item, score };
        }),
      );

      // Sort by score (highest first)
      rankedItems.sort((a, b) => b.score - a.score);

      return rankedItems;
    } catch (error: any) {
      this.logger.error('Failed to rank feed items:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Return original order if ranking fails
      return items;
    }
  }

  /**
   * Calculate engagement score for a feed item
   * @param item Content item
   * @param userId User ID
   * @param followingUserIds Array of followed user IDs
   * @returns Score (0-100)
   */
  private async calculateItemScore(
    item: any,
    userId: string,
    followingUserIds: string[],
  ): Promise<number> {
    let score = 50; // Base score

    try {
      // Recency score (newer content gets higher score)
      const ageInHours =
        (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 30 - ageInHours * 2);
      score += recencyScore;

      // Engagement score
      const engagementScore = Math.min(
        item.likes * 0.1 + item.comments * 0.2 + item.bookmarks * 0.3,
        20,
      );
      score += engagementScore;

      // Author relationship score
      const authorIndex = followingUserIds.indexOf(item.userId);
      if (authorIndex !== -1) {
        // Closer to the beginning of following list = higher score
        const relationshipScore = Math.max(0, 20 - authorIndex * 0.5);
        score += relationshipScore;
      }

      // Mutual connections boost
      if (followingUserIds.length > 1) {
        const mutualCount = await this.getMutualConnectionsCount(
          userId,
          item.userId,
        );
        const mutualScore = Math.min(mutualCount * 2, 15);
        score += mutualScore;
      }

      // Add some randomness to avoid always same order
      score += Math.random() * 5;

      return Math.min(Math.max(score, 0), 100);
    } catch (error) {
      this.logger.warn(`Failed to calculate score for item ${item.id}:`, error);
      return score;
    }
  }

  /**
   * Get mutual connections count between two users
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @returns Number of mutual connections
   */
  private async getMutualConnectionsCount(
    userIdA: string,
    userIdB: string,
  ): Promise<number> {
    try {
      const result = await this.followBitsetService.getMutualFriends(
        userIdA,
        userIdB,
        0,
      );
      return result.count;
    } catch (error) {
      this.logger.warn(
        `Failed to get mutual connections between ${userIdA} and ${userIdB}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Generate cursor for pagination
   * @param item Last item in current page
   * @returns Cursor string
   */
  private generateCursor(item: any): string {
    return Buffer.from(
      JSON.stringify({
        id: item.id,
        publishedAt: item.publishedAt,
      }),
    ).toString('base64');
  }

  /**
   * Parse cursor for pagination
   * @param cursor Cursor string
   * @returns Parsed cursor data
   */
  private parseCursor(
    cursor: string,
  ): { id: string; publishedAt: Date } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return {
        id: parsed.id,
        publishedAt: new Date(parsed.publishedAt),
      };
    } catch (error) {
      this.logger.warn('Failed to parse cursor:', error);
      return null;
    }
  }

  /**
   * Get trending content (placeholder)
   * @param limit Maximum number of items
   * @returns Array of trending items
   */
  async getTrendingContent(limit: number = 20): Promise<any[]> {
    try {
      this.logger.debug('Getting trending content');

      // This is a placeholder implementation
      // In a real system, this would analyze engagement metrics,
      // time decay, and other factors to determine trending content

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get trending content:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Get content recommendations based on follow relationships
   * @param userId User ID
   * @param limit Maximum number of recommendations
   * @returns Array of recommended content
   */
  async getContentRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      this.logger.debug(`Getting content recommendations for user ${userId}`);

      // Get following users
      const followingResult = await this.followBitsetService.getFollowingIds(
        userId,
        100,
      );
      const followingUserIds = followingResult.userIds;

      if (followingUserIds.length === 0) {
        return [];
      }

      // Get content from followed users' networks
      const recommendations = await this.getContentFromExtendedNetwork(
        followingUserIds,
        limit,
      );

      return recommendations;
    } catch (error: any) {
      this.logger.error(
        `Failed to get content recommendations for user ${userId}:`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Get content from extended network (friends of friends)
   * @param userIds Array of user IDs
   * @param limit Maximum number of items
   * @returns Array of content items
   */
  private async getContentFromExtendedNetwork(
    userIds: string[],
    limit: number,
  ): Promise<any[]> {
    try {
      // This is a placeholder implementation
      // In a real system, this would:
      // 1. Get friends of friends
      // 2. Get their content
      // 3. Apply filtering and ranking

      this.logger.debug(
        `Getting content from extended network of ${userIds.length} users`,
      );
      return [];
    } catch (error: any) {
      this.logger.error('Failed to get content from extended network:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Invalidate user's feed cache
   * @param userId User ID
   */
  async invalidateUserFeed(userId: string): Promise<void> {
    try {
      const patterns = [
        `feed:${userId}:*`,
        `feed:trending:*`,
        `feed:recommendations:${userId}:*`,
      ];

      for (const pattern of patterns) {
        const cacheService = this.cacheService['cacheService'];
        await cacheService.deleteKeysByPattern(pattern);
      }

      this.logger.debug(`Invalidated feed cache for user ${userId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to invalidate feed cache for user ${userId}:`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      // Non-critical error, just log
    }
  }

  /**
   * Get feed statistics
   * @param userId User ID
   * @returns Feed statistics
   */
  async getFeedStats(userId: string): Promise<{
    followingCount: number;
    avgEngagement: number;
    lastFeedUpdate: Date;
  }> {
    try {
      const counters = await this.followBitsetService.getCounters(userId);

      return {
        followingCount: counters.following,
        avgEngagement: 0, // Placeholder
        lastFeedUpdate: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get feed stats for user ${userId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      return {
        followingCount: 0,
        avgEngagement: 0,
        lastFeedUpdate: new Date(),
      };
    }
  }
}
