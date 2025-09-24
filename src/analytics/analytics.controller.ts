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
import { DashboardQueryDto } from './dto/dashboard-query.dto';
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
   * @param query - Query parameters including date range and filters
   * @returns User analytics data
   */
  @Get('users/:userId/overview')
  @Auth()
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<UserAnalyticsResponseDto> {
    return this.analyticsService.getUserAnalytics(userId, query);
  }

  /**
   * Get content performance metrics
   *
   * @param subjectType - Type of content (article, comment, etc.)
   * @param subjectId - ID of the content
   * @param query - Query parameters including date range
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
      query,
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

  /**
   * Get dashboard overview analytics
   *
   * @param query - Dashboard query parameters with advanced filtering
   * @returns Comprehensive dashboard analytics data
   */
  @Get('dashboard/overview')
  @Auth()
  async getDashboardOverview(@Query() query: DashboardQueryDto) {
    return this.analyticsService.getDashboardOverview(query);
  }

  /**
   * Get analytics events with advanced filtering and pagination
   *
   * @param query - Analytics query parameters
   * @returns Paginated analytics events
   */
  @Get('events')
  @Auth()
  async getAnalyticsEvents(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getAnalyticsEvents(query);
  }

  /**
   * Get analytics trends over time
   *
   * @param query - Dashboard query parameters for trend analysis
   * @returns Time series analytics data
   */
  @Get('dashboard/trends')
  @Auth()
  async getAnalyticsTrends(@Query() query: DashboardQueryDto) {
    const dashboardData =
      await this.analyticsService.getDashboardOverview(query);
    return {
      timeSeries: dashboardData.timeSeries,
      totalEvents: dashboardData.totalEvents,
      uniqueUsers: dashboardData.uniqueUsers,
      granularity: query.granularity || 'day',
    };
  }

  /**
   * Get top performing content analytics
   *
   * @param query - Dashboard query parameters
   * @returns Top content performance data
   */
  @Get('dashboard/top-content')
  @Auth()
  async getTopContent(@Query() query: DashboardQueryDto) {
    const dashboardData =
      await this.analyticsService.getDashboardOverview(query);
    return {
      topContent: dashboardData.topContent,
      contentInteractions: dashboardData.contentInteractions,
      subjectTypes: dashboardData.subjectTypes,
    };
  }

  /**
   * Get user engagement analytics
   *
   * @param query - Dashboard query parameters
   * @returns User engagement metrics
   */
  @Get('dashboard/user-engagement')
  @Auth()
  async getUserEngagement(@Query() query: DashboardQueryDto) {
    const dashboardData =
      await this.analyticsService.getDashboardOverview(query);
    return {
      topUsers: dashboardData.topUsers,
      uniqueUsers: dashboardData.uniqueUsers,
      socialInteractions: dashboardData.socialInteractions,
      engagementInteractions: dashboardData.engagementInteractions,
      eventTypes: dashboardData.eventTypes,
    };
  }

  // Helper method to get widget titles
  private getWidgetTitle(widgetType: string): string {
    const titles: Record<string, string> = {
      overview: 'Analytics Overview',
      user_activity: 'User Activity',
      content_performance: 'Content Performance',
      engagement_metrics: 'Engagement Metrics',
      traffic_sources: 'Traffic Sources',
      device_analytics: 'Device Analytics',
      geographic_data: 'Geographic Data',
      conversion_funnel: 'Conversion Funnel',
      retention_analysis: 'Retention Analysis',
      revenue_metrics: 'Revenue Metrics',
    };
    return titles[widgetType] || 'Analytics Widget';
  }
}
