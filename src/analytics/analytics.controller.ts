import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  UserAnalyticsResponseDto,
  ContentPerformanceResponseDto,
  PlatformOverviewResponseDto,
} from './dto/analytics-response.dto';

/**
 * Analytics Controller
 *
 * REST API endpoints for analytics tracking and reporting
 */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Track a single analytics event
   *
   * @param dto - Event data to track
   * @param req - Request object with user information
   * @returns Created analytics event
   */
  @Post('track')
  @Auth()
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.analyticsService.trackEvent(dto, req.user.uid);
  }

  /**
   * Get user analytics overview
   *
   * @param userId - ID of the user
   * @param query - Query parameters including time range
   * @returns User analytics data
   */
  @Get('users/:userId/overview')
  @Auth()
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<UserAnalyticsResponseDto> {
    return this.analyticsService.getUserAnalytics(userId, query.timeRange);
  }

  /**
   * Get content performance metrics
   *
   * @param subjectType - Type of content (article, comment, etc.)
   * @param subjectId - ID of the content
   * @param query - Query parameters including time range
   * @returns Content performance data
   */
  @Get('content/:subjectType/:subjectId/performance')
  @Auth()
  async getContentPerformance(
    @Param('subjectType') subjectType: string,
    @Param('subjectId') subjectId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<ContentPerformanceResponseDto> {
    return this.analyticsService.getContentPerformance(
      subjectType,
      subjectId,
      query.timeRange,
    );
  }

  /**
   * Get platform overview statistics
   *
   * @returns Platform overview data
   */
  @Get('platform/overview')
  @Auth()
  async getPlatformOverview(): Promise<PlatformOverviewResponseDto> {
    return this.analyticsService.getPlatformOverview();
  }
}
