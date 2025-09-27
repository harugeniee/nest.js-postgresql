import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowCacheService } from './follow-cache.service';
import { RoaringAdapter, RoaringSet } from './adapters/roaring.adapter';
import { stringToNumberId, numberToStringId } from './utils/id-utils';
import { UserSuggestionDto } from './dto/follow.dto';

/**
 * FollowSuggestionsService - Generate follow suggestions using bitset operations
 *
 * Implements various algorithms for suggesting users to follow:
 * - Friends of friends
 * - Popular users among followed users
 * - Similar interests (placeholder)
 */
@Injectable()
export class FollowSuggestionsService {
  private readonly logger = new Logger(FollowSuggestionsService.name);

  constructor(
    private readonly followBitsetService: FollowBitsetService,
    private readonly cacheService: FollowCacheService,
    @Inject('BITSET_ADAPTER') private readonly roaringAdapter: RoaringAdapter,
  ) {}

  /**
   * Get follow suggestions for a user
   * @param userId User ID
   * @param limit Maximum number of suggestions
   * @param algorithm Algorithm to use
   * @param includeMutualCount Whether to include mutual friends count
   * @returns Array of user suggestions
   */
  async getSuggestions(
    userId: string,
    limit: number = 20,
    algorithm:
      | 'friends_of_friends'
      | 'popular'
      | 'similar_interests' = 'friends_of_friends',
    includeMutualCount: boolean = false,
  ): Promise<UserSuggestionDto[]> {
    try {
      this.logger.debug(
        `Generating suggestions for user ${userId} using ${algorithm} algorithm`,
      );

      let suggestions: UserSuggestionDto[] = [];

      switch (algorithm) {
        case 'friends_of_friends':
          suggestions = await this.getFriendsOfFriendsSuggestions(
            userId,
            limit,
            includeMutualCount,
          );
          break;
        case 'popular':
          suggestions = await this.getPopularSuggestions(
            userId,
            limit,
            includeMutualCount,
          );
          break;
        case 'similar_interests':
          suggestions = await this.getSimilarInterestsSuggestions(
            userId,
            limit,
            includeMutualCount,
          );
          break;
        default:
          throw new HttpException(
            { messageKey: 'follow.UNKNOWN_SUGGESTION_ALGORITHM' },
            HttpStatus.BAD_REQUEST,
          );
      }

      this.logger.debug(
        `Generated ${suggestions.length} suggestions for user ${userId}`,
      );
      return suggestions;
    } catch (error: any) {
      this.logger.error(`Failed to get suggestions for user ${userId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { messageKey: 'follow.GET_SUGGESTIONS_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get friends of friends suggestions
   * @param userId User ID
   * @param limit Maximum number of suggestions
   * @param includeMutualCount Whether to include mutual friends count
   * @returns Array of suggestions
   */
  private async getFriendsOfFriendsSuggestions(
    userId: string,
    limit: number,
    includeMutualCount: boolean,
  ): Promise<UserSuggestionDto[]> {
    try {
      // Get user's following set
      const userFollowingSet = await this.getUserFollowingSet(userId);
      if (!userFollowingSet || userFollowingSet.isEmpty()) {
        this.logger.debug(
          `User ${userId} has no following, returning empty suggestions`,
        );
        return [];
      }

      // Get friends of friends by OR-ing all following sets
      const friendsOfFriends = await this.getFriendsOfFriendsSet(
        userId,
        userFollowingSet,
      );

      // Remove self and already following
      const selfId = stringToNumberId(userId);
      friendsOfFriends.remove(selfId);
      friendsOfFriends.andNot(userFollowingSet);

      // Convert to suggestions
      const suggestions = await this.convertToSuggestions(
        friendsOfFriends,
        limit,
        includeMutualCount ? userFollowingSet : null,
        'friends_of_friends',
      );

      return suggestions;
    } catch (error) {
      this.logger.error(
        `Failed to get friends of friends suggestions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get popular users suggestions
   * @param userId User ID
   * @param limit Maximum number of suggestions
   * @param includeMutualCount Whether to include mutual friends count
   * @returns Array of suggestions
   */
  private async getPopularSuggestions(
    userId: string,
    limit: number,
    includeMutualCount: boolean,
  ): Promise<UserSuggestionDto[]> {
    try {
      // Get user's following set
      const userFollowingSet = await this.getUserFollowingSet(userId);

      // Get popular users among followed users
      const popularUsers = await this.getPopularUsersAmongFollowing(
        userId,
        userFollowingSet,
      );

      // Remove self and already following
      const selfId = stringToNumberId(userId);
      popularUsers.remove(selfId);
      if (userFollowingSet) {
        popularUsers.andNot(userFollowingSet);
      }

      // Convert to suggestions
      const suggestions = await this.convertToSuggestions(
        popularUsers,
        limit,
        includeMutualCount ? userFollowingSet : null,
        'popular',
      );

      return suggestions;
    } catch (error) {
      this.logger.error(
        `Failed to get popular suggestions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get similar interests suggestions (placeholder implementation)
   * @param userId User ID
   * @param limit Maximum number of suggestions
   * @param includeMutualCount Whether to include mutual friends count
   * @returns Array of suggestions
   */
  private async getSimilarInterestsSuggestions(
    userId: string,
    limit: number,
    includeMutualCount: boolean,
  ): Promise<UserSuggestionDto[]> {
    // This is a placeholder implementation
    // In a real system, this would analyze user interests, content preferences, etc.
    this.logger.debug(
      `Similar interests suggestions not implemented for user ${userId}`,
    );
    return [];
  }

  /**
   * Get friends of friends set
   * @param userId User ID
   * @param userFollowingSet User's following set
   * @returns RoaringSet of friends of friends
   */
  private async getFriendsOfFriendsSet(
    userId: string,
    userFollowingSet: RoaringSet,
  ): Promise<RoaringSet> {
    const friendsOfFriends = this.roaringAdapter.newSet();
    const followingIds = userFollowingSet.toArray();

    // For each followed user, get their following set and union
    for (const followeeId of followingIds) {
      try {
        const followeeIdStr = numberToStringId(followeeId);
        const followeeFollowingSet =
          await this.getUserFollowingSet(followeeIdStr);

        if (followeeFollowingSet && !followeeFollowingSet.isEmpty()) {
          friendsOfFriends.or(followeeFollowingSet);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get following set for user ${followeeId}:`,
          error,
        );
        // Continue with other users
      }
    }

    return friendsOfFriends;
  }

  /**
   * Get popular users among followed users
   * @param userId User ID
   * @param userFollowingSet User's following set
   * @returns RoaringSet of popular users
   */
  private async getPopularUsersAmongFollowing(
    userId: string,
    userFollowingSet: RoaringSet | null,
  ): Promise<RoaringSet> {
    // This is a simplified implementation
    // In a real system, you'd analyze follower counts, engagement, etc.
    const popularUsers = this.roaringAdapter.newSet();

    if (!userFollowingSet) {
      return popularUsers;
    }

    const followingIds = userFollowingSet.toArray();

    // For each followed user, get their followers and union
    for (const followeeId of followingIds) {
      try {
        const followeeIdStr = numberToStringId(followeeId);
        const followeeFollowersSet =
          await this.getUserFollowersSet(followeeIdStr);

        if (followeeFollowersSet && !followeeFollowersSet.isEmpty()) {
          popularUsers.or(followeeFollowersSet);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get followers set for user ${followeeId}:`,
          error,
        );
        // Continue with other users
      }
    }

    return popularUsers;
  }

  /**
   * Convert bitset to user suggestions
   * @param bitset RoaringSet of user IDs
   * @param limit Maximum number of suggestions
   * @param userFollowingSet User's following set for mutual count calculation
   * @param reason Reason for suggestion
   * @returns Array of user suggestions
   */
  private async convertToSuggestions(
    bitset: RoaringSet,
    limit: number,
    userFollowingSet: RoaringSet | null,
    reason: string,
  ): Promise<UserSuggestionDto[]> {
    const userIds = bitset.toArray(limit).map(numberToStringId);
    const suggestions: UserSuggestionDto[] = [];

    for (const userId of userIds) {
      try {
        // Calculate mutual count if requested
        let mutualCount = 0;
        if (userFollowingSet) {
          const userFollowingSetForMutual =
            await this.getUserFollowingSet(userId);
          if (userFollowingSetForMutual) {
            const mutualSet = userFollowingSet.and(userFollowingSetForMutual);
            mutualCount = mutualSet.size();
          }
        }

        // Get user info (this would typically come from a user service)
        const userInfo = await this.getUserInfo(userId);

        suggestions.push({
          userId,
          name: userInfo.name || `User ${userId}`,
          username: userInfo.username || `user_${userId}`,
          avatarUrl: userInfo.avatarUrl,
          score: this.calculateScore(userId, reason, mutualCount),
          mutualCount: mutualCount > 0 ? mutualCount : undefined,
          reason: this.getReasonText(reason, mutualCount),
          isVerified: userInfo.isVerified || false,
        });
      } catch (error) {
        this.logger.warn(`Failed to get user info for ${userId}:`, error);
        // Continue with other users
      }
    }

    // Sort by score (highest first)
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions;
  }

  /**
   * Get user's following set
   * @param userId User ID
   * @returns RoaringSet or null
   */
  private async getUserFollowingSet(
    userId: string,
  ): Promise<RoaringSet | null> {
    try {
      // Try cache first
      const cached = await this.cacheService.getFollowingSet(userId);
      if (cached) return cached;

      // Fallback to service
      const result = await this.followBitsetService.getFollowingIds(
        userId,
        1000,
      );
      if (!result.userIds.length) return null;

      // Convert to bitset
      const set = this.roaringAdapter.newSet();
      for (const id of result.userIds) {
        set.add(stringToNumberId(id));
      }

      // Cache the result
      await this.cacheService.saveFollowingSet(userId, set);

      return set;
    } catch (error) {
      this.logger.warn(
        `Failed to get following set for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get user's followers set
   * @param userId User ID
   * @returns RoaringSet or null
   */
  private async getUserFollowersSet(
    userId: string,
  ): Promise<RoaringSet | null> {
    try {
      // Try cache first
      const cached = await this.cacheService.getFollowersSet(userId);
      if (cached) return cached;

      // Fallback to service
      const result = await this.followBitsetService.getFollowersIds(
        userId,
        1000,
      );
      if (!result.userIds.length) return null;

      // Convert to bitset
      const set = this.roaringAdapter.newSet();
      for (const id of result.userIds) {
        set.add(stringToNumberId(id));
      }

      // Cache the result
      await this.cacheService.saveFollowersSet(userId, set);

      return set;
    } catch (error) {
      this.logger.warn(
        `Failed to get followers set for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get user information (placeholder)
   * @param userId User ID
   * @returns User information
   */
  private async getUserInfo(userId: string): Promise<{
    name?: string;
    username?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  }> {
    // This is a placeholder implementation
    // In a real system, this would call a user service
    return {
      name: `User ${userId}`,
      username: `user_${userId}`,
      avatarUrl: undefined,
      isVerified: false,
    };
  }

  /**
   * Calculate suggestion score
   * @param userId User ID
   * @param reason Reason for suggestion
   * @param mutualCount Number of mutual friends
   * @returns Score (0-100)
   */
  private calculateScore(
    userId: string,
    reason: string,
    mutualCount: number,
  ): number {
    let score = 50; // Base score

    // Boost score based on mutual friends
    score += Math.min(mutualCount * 5, 30);

    // Boost score based on reason
    switch (reason) {
      case 'friends_of_friends':
        score += 20;
        break;
      case 'popular':
        score += 15;
        break;
      case 'similar_interests':
        score += 25;
        break;
    }

    // Add some randomness to avoid always same order
    score += Math.random() * 10;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Get reason text for suggestion
   * @param reason Reason code
   * @param mutualCount Number of mutual friends
   * @returns Human-readable reason
   */
  private getReasonText(reason: string, mutualCount: number): string {
    switch (reason) {
      case 'friends_of_friends':
        if (mutualCount > 0) {
          return `Followed by ${mutualCount} mutual friend${mutualCount > 1 ? 's' : ''}`;
        }
        return 'Followed by people you follow';
      case 'popular':
        return 'Popular among your network';
      case 'similar_interests':
        return 'Similar interests to you';
      default:
        return 'Suggested for you';
    }
  }
}
