import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Auth } from '../common/decorators';
import { AuthPayload } from '../common/interface';
import { SnowflakeIdPipe } from '../common/pipes';
import { FollowBitsetService } from './follow-bitset.service';
import { FollowSuggestionsService } from './follow-suggestions.service';
import { NewsFeedService } from './newsfeed.service';
import {
  PaginationDto,
  MutualFriendsDto,
  FollowSuggestionsDto,
  FollowCountersDto,
  FollowStatusDto,
  FollowingListDto,
  FollowersListDto,
  MutualFriendsListDto,
  FollowSuggestionsListDto,
  BitsetExportDto,
  BitsetImportDto,
  RebuildDto,
} from './dto/follow.dto';

/**
 * FollowController - REST API endpoints for follow system
 *
 * Provides comprehensive follow/unfollow functionality using roaring bitmap
 * for high-performance social media operations
 */
@ApiTags('Follow System')
@Controller('follow')
@ApiBearerAuth()
export class FollowController {
  constructor(
    private readonly followBitsetService: FollowBitsetService,
    private readonly followSuggestionsService: FollowSuggestionsService,
    private readonly newsFeedService: NewsFeedService,
  ) {}

  /**
   * Follow a user
   */
  @Post(':targetUserId')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'targetUserId', description: 'ID of the user to follow' })
  @ApiResponse({ status: 200, description: 'Successfully followed user' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot follow yourself',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async followUser(
    @Param('targetUserId', new SnowflakeIdPipe()) targetUserId: string,
    @Request() req: Request & { user: AuthPayload },
  ) {
    const followerId = req.user.uid;
    const result = await this.followBitsetService.follow(
      followerId,
      targetUserId,
    );

    return {
      success: result.success,
      status: result.status,
      message:
        result.status === 'followed'
          ? 'Successfully followed user'
          : 'Already following this user',
    };
  }

  /**
   * Unfollow a user
   */
  @Delete(':targetUserId')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'targetUserId', description: 'ID of the user to unfollow' })
  @ApiResponse({ status: 200, description: 'Successfully unfollowed user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unfollowUser(
    @Param('targetUserId', new SnowflakeIdPipe()) targetUserId: string,
    @Request() req: Request & { user: AuthPayload },
  ) {
    const followerId = req.user.uid;
    const result = await this.followBitsetService.unfollow(
      followerId,
      targetUserId,
    );

    return {
      success: result.success,
      status: result.status,
      message:
        result.status === 'unfollowed'
          ? 'Successfully unfollowed user'
          : 'Not following this user',
    };
  }

  /**
   * Get following list for a user
   */
  @Get(':userId/following')
  @Auth()
  @ApiOperation({ summary: 'Get following list for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get following list for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiResponse({
    status: 200,
    description: 'Following list retrieved successfully',
    type: FollowingListDto,
  })
  async getFollowing(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query() query: PaginationDto,
  ): Promise<FollowingListDto> {
    const limit = query.limit || 20;
    const result = await this.followBitsetService.getFollowingIds(
      userId,
      limit,
      query.cursor,
    );

    // Convert to user suggestions format (would need user service integration)
    const users = result.userIds.map((userId) => ({
      userId,
      name: `User ${userId}`,
      username: `user_${userId}`,
      avatarUrl: undefined,
      score: 0,
      reason: 'Following',
      isVerified: false,
    }));

    return {
      users,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.userIds.length, // This would be the actual total count
    };
  }

  /**
   * Get followers list for a user
   */
  @Get(':userId/followers')
  @Auth()
  @ApiOperation({ summary: 'Get followers list for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get followers list for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiResponse({
    status: 200,
    description: 'Followers list retrieved successfully',
    type: FollowersListDto,
  })
  async getFollowers(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query() query: PaginationDto,
  ): Promise<FollowersListDto> {
    const limit = query.limit || 20;
    const result = await this.followBitsetService.getFollowersIds(
      userId,
      limit,
      query.cursor,
    );

    // Convert to user suggestions format (would need user service integration)
    const users = result.userIds.map((userId) => ({
      userId,
      name: `User ${userId}`,
      username: `user_${userId}`,
      avatarUrl: undefined,
      score: 0,
      reason: 'Follower',
      isVerified: false,
    }));

    return {
      users,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.userIds.length, // This would be the actual total count
    };
  }

  /**
   * Get mutual friends between two users
   */
  @Get('mutuals')
  @Auth()
  @ApiOperation({ summary: 'Get mutual friends between two users' })
  @ApiQuery({ name: 'userA', description: 'First user ID' })
  @ApiQuery({ name: 'userB', description: 'Second user ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutual friends retrieved successfully',
    type: MutualFriendsListDto,
  })
  async getMutualFriends(
    @Query() query: MutualFriendsDto,
  ): Promise<MutualFriendsListDto> {
    const limit = query.limit || 20;
    const result = await this.followBitsetService.getMutualFriends(
      query.userA,
      query.userB,
      limit,
    );

    // Convert to user suggestions format (would need user service integration)
    const users = result.userIds.map((userId) => ({
      userId,
      name: `User ${userId}`,
      username: `user_${userId}`,
      avatarUrl: undefined,
      score: 0,
      reason: 'Mutual friend',
      isVerified: false,
    }));

    return {
      users,
      hasMore: result.userIds.length === limit,
      total: result.count,
    };
  }

  /**
   * Get follow suggestions for a user
   */
  @Get(':userId/suggestions')
  @Auth()
  @ApiOperation({ summary: 'Get follow suggestions for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get suggestions for' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of suggestions',
  })
  @ApiQuery({
    name: 'algorithm',
    required: false,
    description: 'Suggestion algorithm',
  })
  @ApiQuery({
    name: 'includeMutualCount',
    required: false,
    description: 'Include mutual friends count',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    type: FollowSuggestionsListDto,
  })
  async getSuggestions(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query() query: FollowSuggestionsDto,
  ): Promise<FollowSuggestionsListDto> {
    const limit = query.limit || 20;
    const algorithm = query.algorithm || 'friends_of_friends';
    const includeMutualCount = query.includeMutualCount || false;

    const suggestions = await this.followSuggestionsService.getSuggestions(
      userId,
      limit,
      algorithm,
      includeMutualCount,
    );

    return {
      suggestions,
      hasMore: suggestions.length === limit,
      algorithm,
    };
  }

  /**
   * Get follow status between two users
   */
  @Get('status')
  @Auth()
  @ApiOperation({ summary: 'Get follow status between two users' })
  @ApiQuery({ name: 'followerId', description: 'Follower user ID' })
  @ApiQuery({ name: 'followeeId', description: 'Followee user ID' })
  @ApiResponse({
    status: 200,
    description: 'Follow status retrieved successfully',
    type: FollowStatusDto,
  })
  async getFollowStatus(
    @Query('followerId') followerId: string,
    @Query('followeeId') followeeId: string,
  ): Promise<FollowStatusDto> {
    if (!followerId || !followeeId) {
      throw new HttpException(
        { messageKey: 'follow.MISSING_REQUIRED_PARAMETERS' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.followBitsetService.getFollowStatus(
      followerId,
      followeeId,
    );
  }

  /**
   * Get follow counters for a user
   */
  @Get(':userId/counters')
  @Auth()
  @ApiOperation({ summary: 'Get follow counters for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get counters for' })
  @ApiResponse({
    status: 200,
    description: 'Counters retrieved successfully',
    type: FollowCountersDto,
  })
  async getCounters(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
  ): Promise<FollowCountersDto> {
    return await this.followBitsetService.getCounters(userId);
  }

  /**
   * Export bitset data
   */
  @Post(':userId/export')
  @Auth()
  @ApiOperation({ summary: 'Export bitset data for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to export data for' })
  @ApiQuery({
    name: 'type',
    description: 'Type of bitset to export',
    enum: ['following', 'followers'],
  })
  @ApiResponse({
    status: 200,
    description: 'Bitset exported successfully',
    type: BitsetExportDto,
  })
  async exportBitset(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query('type') type: 'following' | 'followers',
  ): Promise<BitsetExportDto> {
    if (!type || !['following', 'followers'].includes(type)) {
      throw new HttpException(
        { messageKey: 'follow.INVALID_BITSET_TYPE' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.followBitsetService.exportBitset(userId, type);
    return {
      ...result,
      type,
    };
  }

  /**
   * Import bitset data
   */
  @Post(':userId/import')
  @Auth()
  @ApiOperation({ summary: 'Import bitset data for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to import data for' })
  @ApiResponse({ status: 200, description: 'Bitset imported successfully' })
  async importBitset(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Body() importDto: BitsetImportDto,
  ) {
    const result = await this.followBitsetService.importBitset(
      userId,
      importDto.data,
      importDto.type,
      importDto.replace || false,
    );

    return {
      success: result.success,
      count: result.count,
      message: `Successfully imported ${result.count} ${importDto.type} relationships`,
    };
  }

  /**
   * Rebuild bitset from edges
   */
  @Post(':userId/rebuild')
  @Auth()
  @ApiOperation({ summary: 'Rebuild bitset from edges for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to rebuild bitset for' })
  @ApiResponse({ status: 200, description: 'Bitset rebuilt successfully' })
  async rebuildBitset(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Body() rebuildDto: RebuildDto,
  ) {
    const result = await this.followBitsetService.rebuildFromEdges(
      userId,
      rebuildDto.force || false,
    );

    return {
      success: result.success,
      count: result.count,
      message: `Successfully rebuilt bitset with ${result.count} relationships`,
    };
  }

  /**
   * Get news feed for a user
   */
  @Get(':userId/feed')
  @Auth()
  @ApiOperation({ summary: 'Get news feed for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get feed for' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of feed items',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Pagination cursor',
  })
  @ApiResponse({ status: 200, description: 'News feed retrieved successfully' })
  async getNewsFeed(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query() query: PaginationDto,
  ) {
    const limit = query.limit || 20;
    return await this.newsFeedService.generateUserFeed(
      userId,
      limit,
      query.cursor,
    );
  }

  /**
   * Get trending content
   */
  @Get('trending')
  @Auth()
  @ApiOperation({ summary: 'Get trending content' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of trending items',
  })
  @ApiResponse({
    status: 200,
    description: 'Trending content retrieved successfully',
  })
  async getTrendingContent(@Query('limit') limit: number = 20) {
    return await this.newsFeedService.getTrendingContent(limit);
  }

  /**
   * Get content recommendations
   */
  @Get(':userId/recommendations')
  @Auth()
  @ApiOperation({ summary: 'Get content recommendations for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get recommendations for',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
  })
  async getContentRecommendations(
    @Param('userId', new SnowflakeIdPipe()) userId: string,
    @Query('limit') limit: number = 10,
  ) {
    return await this.newsFeedService.getContentRecommendations(userId, limit);
  }

  /**
   * Get feed statistics
   */
  @Get(':userId/feed/stats')
  @Auth()
  @ApiOperation({ summary: 'Get feed statistics for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to get stats for' })
  @ApiResponse({
    status: 200,
    description: 'Feed statistics retrieved successfully',
  })
  async getFeedStats(@Param('userId', new SnowflakeIdPipe()) userId: string) {
    return await this.newsFeedService.getFeedStats(userId);
  }
}
