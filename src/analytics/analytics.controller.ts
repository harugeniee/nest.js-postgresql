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
  DashboardWidgetQueryDto,
  RealTimeAnalyticsQueryDto,
  AnalyticsExportQueryDto,
} from './dto/dashboard-widget.dto';
import {
  UserAnalyticsResponseDto,
  ContentPerformanceResponseDto,
  PlatformOverviewResponseDto,
} from './dto/analytics-response.dto';
import {
  DashboardWidgetResponseDto,
  RealTimeAnalyticsResponseDto,
  AnalyticsExportResponseDto,
} from './dto/dashboard-response.dto';

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

  /**
   * Get analytics widget data
   *
   * @param widgetType - Type of widget to retrieve
   * @param query - Widget query parameters
   * @returns Widget data
   */
  @Get('widgets/:widgetType')
  @Auth()
  async getAnalyticsWidget(
    @Param('widgetType') widgetType: string,
    @Query() query: DashboardWidgetQueryDto,
  ): Promise<DashboardWidgetResponseDto> {
    const data = await this.analyticsService.getAnalyticsWidgets(
      widgetType,
      query,
    );

    return {
      widgetType,
      title: this.getWidgetTitle(widgetType),
      data,
      metadata: {
        lastUpdated: new Date(),
        dataPoints: query.dataPoints || 30,
        granularity: query.granularity || 'day',
        comparison: query.includeComparison
          ? {
              period: query.comparisonType || 'previous_period',
              change: 0, // Would need comparison calculation
              changeType: 'no_change' as const,
            }
          : undefined,
      },
    };
  }

  /**
   * Get real-time analytics data
   *
   * @param query - Real-time analytics query parameters
   * @returns Real-time analytics data
   */
  @Get('realtime')
  @Auth()
  async getRealTimeAnalytics(
    @Query() query: RealTimeAnalyticsQueryDto,
  ): Promise<RealTimeAnalyticsResponseDto> {
    return this.analyticsService.getRealTimeAnalytics(query);
  }

  /**
   * Get real-time metrics summary
   *
   * @returns Real-time metrics summary
   */
  @Get('realtime/summary')
  @Auth()
  async getRealTimeMetricsSummary() {
    return this.analyticsService.getRealTimeMetricsSummary();
  }

  /**
   * Get real-time connection statistics
   *
   * @returns Real-time connection statistics
   */
  @Get('realtime/connections')
  @Auth()
  async getRealTimeConnectionStats() {
    return this.analyticsService.getRealTimeConnectionStats();
  }

  /**
   * Export analytics data
   *
   * @param query - Export query parameters
   * @returns Export response with download URL
   */
  @Get('export')
  @Auth()
  async exportAnalyticsData(
    @Query() query: AnalyticsExportQueryDto,
  ): Promise<AnalyticsExportResponseDto> {
    return this.analyticsService.exportAnalyticsData(query);
  }

  /**
   * Get comprehensive dashboard data
   *
   * @param query - Dashboard query parameters
   * @returns Comprehensive dashboard data
   */
  @Get('dashboard/comprehensive')
  @Auth()
  async getComprehensiveDashboard(@Query() query: DashboardQueryDto) {
    const [
      overview,
      userActivity,
      contentPerformance,
      engagementMetrics,
      trafficSources,
      realTimeMetrics,
    ] = await Promise.all([
      this.analyticsService.getDashboardOverview(query),
      this.analyticsService.getAnalyticsWidgets('user_activity', query),
      this.analyticsService.getAnalyticsWidgets('content_performance', query),
      this.analyticsService.getAnalyticsWidgets('engagement_metrics', query),
      this.analyticsService.getAnalyticsWidgets('traffic_sources', query),
      this.analyticsService.getRealTimeMetricsSummary(),
    ]);

    return {
      overview,
      widgets: {
        userActivity,
        contentPerformance,
        engagementMetrics,
        trafficSources,
      },
      realTime: realTimeMetrics,
      metadata: {
        generatedAt: new Date(),
        query,
      },
    };
  }

  /**
   * Get analytics health check
   *
   * @returns Analytics system health status
   */
  @Get('health')
  @Auth()
  async getAnalyticsHealth() {
    const [totalEvents, recentEvents, realTimeStats, cacheStatus] =
      await Promise.all([
        this.analyticsService.getPlatformOverview(),
        this.analyticsService.getAnalyticsEvents({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          order: 'DESC',
        }),
        this.analyticsService.getRealTimeConnectionStats(),
        { status: 'healthy' }, // Would check cache service status
      ]);

    return {
      status: 'healthy',
      timestamp: new Date(),
      metrics: {
        totalEvents: totalEvents.totalEvents,
        totalUsers: totalEvents.totalUsers,
        recentEventsCount: recentEvents.total,
        realTimeConnections: realTimeStats.activeConnections,
        cacheStatus: cacheStatus.status,
      },
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
