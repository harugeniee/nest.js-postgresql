import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AnalyticsMetric } from '../entities/analytics-metric.entity';
import { DashboardWidgetQueryDto } from '../dto/dashboard-widget.dto';
import {
  UserActivityDashboardDto,
  ContentPerformanceDashboardDto,
  EngagementMetricsDashboardDto,
  TrafficSourcesDashboardDto,
  GeographicDataDashboardDto,
  ConversionFunnelDashboardDto,
  RetentionAnalysisDashboardDto,
  RevenueMetricsDashboardDto,
} from '../dto/dashboard-response.dto';

/**
 * Analytics Widgets Service
 *
 * Service for generating specialized dashboard widgets and analytics views
 */
@Injectable()
export class AnalyticsWidgetsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsMetric)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetric>,
  ) {}

  /**
   * Get user activity dashboard data
   */
  async getUserActivityDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<UserActivityDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    // Get basic user metrics
    const [
      totalActiveUsers,
      newUsers,
      returningUsers,
      userEngagement,
      topUserActions,
      userRetention,
      timeSeries,
    ] = await Promise.all([
      this.getTotalActiveUsers(dateCondition),
      this.getNewUsers(dateCondition),
      this.getReturningUsers(dateCondition),
      this.getUserEngagementMetrics(dateCondition),
      this.getTopUserActions(dateCondition),
      this.getUserRetentionMetrics(dateCondition),
      this.getUserActivityTimeSeries(dateCondition, granularity),
    ]);

    return {
      totalActiveUsers,
      newUsers,
      returningUsers,
      userEngagement,
      topUserActions,
      userRetention,
      timeSeries,
    };
  }

  /**
   * Get content performance dashboard data
   */
  async getContentPerformanceDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<ContentPerformanceDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      totalContent,
      topPerformingContent,
      contentMetrics,
      trendingContent,
      timeSeries,
    ] = await Promise.all([
      this.getTotalContent(dateCondition),
      this.getTopPerformingContent(dateCondition),
      this.getContentMetrics(dateCondition),
      this.getTrendingContent(dateCondition),
      this.getContentPerformanceTimeSeries(dateCondition, granularity),
    ]);

    return {
      totalContent,
      topPerformingContent,
      contentMetrics,
      trendingContent,
      timeSeries,
    };
  }

  /**
   * Get engagement metrics dashboard data
   */
  async getEngagementMetricsDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<EngagementMetricsDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      overallEngagement,
      engagementBreakdown,
      topEngagementSources,
      engagementTrends,
      userEngagementSegments,
    ] = await Promise.all([
      this.getOverallEngagement(dateCondition),
      this.getEngagementBreakdown(dateCondition),
      this.getTopEngagementSources(dateCondition),
      this.getEngagementTrends(dateCondition, granularity),
      this.getUserEngagementSegments(dateCondition),
    ]);

    return {
      overallEngagement,
      engagementBreakdown,
      topEngagementSources,
      engagementTrends,
      userEngagementSegments,
    };
  }

  /**
   * Get traffic sources dashboard data
   */
  async getTrafficSourcesDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<TrafficSourcesDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      totalTraffic,
      trafficSources,
      referrers,
      deviceBreakdown,
      browserBreakdown,
      timeSeries,
    ] = await Promise.all([
      this.getTotalTraffic(dateCondition),
      this.getTrafficSources(dateCondition),
      this.getReferrers(dateCondition),
      this.getDeviceBreakdown(dateCondition),
      this.getBrowserBreakdown(dateCondition),
      this.getTrafficTimeSeries(dateCondition, granularity),
    ]);

    return {
      totalTraffic,
      trafficSources,
      referrers,
      deviceBreakdown,
      browserBreakdown,
      timeSeries,
    };
  }

  /**
   * Get geographic data dashboard
   */
  async getGeographicDataDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<GeographicDataDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      totalCountries,
      topCountries,
      topCities,
      geographicDistribution,
      timeSeries,
    ] = await Promise.all([
      this.getTotalCountries(dateCondition),
      this.getTopCountries(dateCondition),
      this.getTopCities(dateCondition),
      this.getGeographicDistribution(dateCondition),
      this.getGeographicTimeSeries(dateCondition, granularity),
    ]);

    return {
      totalCountries,
      topCountries,
      topCities,
      geographicDistribution,
      timeSeries,
    };
  }

  /**
   * Get conversion funnel dashboard data
   */
  async getConversionFunnelDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<ConversionFunnelDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      funnelSteps,
      overallConversion,
      topConversionPaths,
      conversionTrends,
      bottlenecks,
    ] = await Promise.all([
      this.getFunnelSteps(dateCondition),
      this.getOverallConversion(dateCondition),
      this.getTopConversionPaths(dateCondition),
      this.getConversionTrends(dateCondition, granularity),
      this.getFunnelBottlenecks(dateCondition),
    ]);

    return {
      funnelSteps,
      overallConversion,
      topConversionPaths,
      conversionTrends,
      bottlenecks,
    };
  }

  /**
   * Get retention analysis dashboard data
   */
  async getRetentionAnalysisDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<RetentionAnalysisDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [cohortAnalysis, retentionRates, retentionTrends, churnAnalysis] =
      await Promise.all([
        this.getCohortAnalysis(dateCondition),
        this.getRetentionRates(dateCondition),
        this.getRetentionTrends(dateCondition, granularity),
        this.getChurnAnalysis(dateCondition),
      ]);

    return {
      cohortAnalysis,
      retentionRates,
      retentionTrends,
      churnAnalysis,
    };
  }

  /**
   * Get revenue metrics dashboard data
   */
  async getRevenueMetricsDashboard(
    query: DashboardWidgetQueryDto,
  ): Promise<RevenueMetricsDashboardDto> {
    const dateCondition = this.buildDateCondition(query);
    const granularity = query.granularity || 'day';

    const [
      totalRevenue,
      revenueBreakdown,
      revenueTrends,
      topRevenueGenerators,
      conversionMetrics,
    ] = await Promise.all([
      this.getTotalRevenue(dateCondition),
      this.getRevenueBreakdown(dateCondition),
      this.getRevenueTrends(dateCondition, granularity),
      this.getTopRevenueGenerators(dateCondition),
      this.getConversionMetrics(dateCondition),
    ]);

    return {
      totalRevenue,
      revenueBreakdown,
      revenueTrends,
      topRevenueGenerators,
      conversionMetrics,
    };
  }

  // Private helper methods

  private buildDateCondition(query: DashboardWidgetQueryDto) {
    if (query.fromDate && query.toDate) {
      return Between(query.fromDate, query.toDate);
    } else if (query.fromDate) {
      return MoreThan(query.fromDate);
    } else if (query.toDate) {
      return MoreThan(query.toDate);
    } else {
      // Default to last 30 days
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      return MoreThan(defaultStartDate);
    }
  }

  // User Activity Methods
  private async getTotalActiveUsers(dateCondition: any): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();
    return parseInt(result.count) || 0;
  }

  private async getNewUsers(dateCondition: any): Promise<number> {
    // Users who first appeared in the date range
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.userId IS NOT NULL')
      .andWhere(
        'event.userId NOT IN (SELECT DISTINCT userId FROM analytics_events WHERE createdAt < :startDate AND userId IS NOT NULL)',
        { startDate: dateCondition },
      )
      .getRawOne();
    return parseInt(result.count) || 0;
  }

  private async getReturningUsers(dateCondition: any): Promise<number> {
    const totalActive = await this.getTotalActiveUsers(dateCondition);
    const newUsers = await this.getNewUsers(dateCondition);
    return totalActive - newUsers;
  }

  private async getUserEngagementMetrics(dateCondition: any) {
    // Simplified engagement metrics
    return {
      averageSessionDuration: 0, // Would need session tracking
      sessionsPerUser: 0, // Would need session tracking
      bounceRate: 0, // Would need session tracking
    };
  }

  private async getTopUserActions(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.userId IS NOT NULL')
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map((item) => ({
      action: item.action,
      count: parseInt(item.count),
      percentage: (parseInt(item.count) / total) * 100,
    }));
  }

  private async getUserRetentionMetrics(dateCondition: any) {
    // Simplified retention metrics
    return {
      day1: 0, // Would need cohort analysis
      day7: 0,
      day30: 0,
    };
  }

  private async getUserActivityTimeSeries(
    dateCondition: any,
    granularity: string,
  ) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(this.getDateTruncate(granularity), 'date')
      .addSelect('COUNT(DISTINCT event.userId)', 'activeUsers')
      .addSelect('COUNT(*)', 'sessions')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.userId IS NOT NULL')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      activeUsers: parseInt(item.activeUsers),
      newUsers: 0, // Would need more complex query
      sessions: parseInt(item.sessions),
    }));
  }

  // Content Performance Methods
  private async getTotalContent(dateCondition: any): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(
        'COUNT(DISTINCT CONCAT(event.subjectType, ":", event.subjectId))',
        'count',
      )
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.subjectType IS NOT NULL')
      .andWhere('event.subjectId IS NOT NULL')
      .getRawOne();
    return parseInt(result.count) || 0;
  }

  private async getTopPerformingContent(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.subjectType', 'type')
      .addSelect('event.subjectId', 'id')
      .addSelect('COUNT(*)', 'views')
      .addSelect(
        'SUM(CASE WHEN event.eventType = "article_like" THEN 1 ELSE 0 END)',
        'likes',
      )
      .addSelect(
        'SUM(CASE WHEN event.eventType = "comment_create" THEN 1 ELSE 0 END)',
        'comments',
      )
      .addSelect(
        'SUM(CASE WHEN event.eventType = "article_share" THEN 1 ELSE 0 END)',
        'shares',
      )
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.subjectType IS NOT NULL')
      .andWhere('event.subjectId IS NOT NULL')
      .groupBy('event.subjectType, event.subjectId')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      id: item.id,
      title: `Content ${item.id}`, // Would need to join with actual content
      type: item.type,
      views: parseInt(item.views),
      likes: parseInt(item.likes) || 0,
      comments: parseInt(item.comments) || 0,
      shares: parseInt(item.shares) || 0,
      engagementRate: 0, // Would need calculation
    }));
  }

  private async getContentMetrics(dateCondition: any) {
    const totalViews = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.eventType = "article_view"')
      .getRawOne();

    return {
      averageViews: parseInt(totalViews.count) || 0,
      averageEngagement: 0, // Would need calculation
      topContentType: 'article', // Would need analysis
    };
  }

  private async getTrendingContent(dateCondition: any) {
    // Simplified trending content
    return [];
  }

  private async getContentPerformanceTimeSeries(
    dateCondition: any,
    granularity: string,
  ) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(this.getDateTruncate(granularity), 'date')
      .addSelect(
        'COUNT(CASE WHEN event.eventType = "article_view" THEN 1 END)',
        'totalViews',
      )
      .addSelect(
        'COUNT(CASE WHEN event.eventType IN ("article_like", "comment_create", "article_share") THEN 1 END)',
        'totalEngagement',
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN event.eventType = "article_view" THEN CONCAT(event.subjectType, ":", event.subjectId) END)',
        'newContent',
      )
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      totalViews: parseInt(item.totalViews),
      totalEngagement: parseInt(item.totalEngagement),
      newContent: parseInt(item.newContent),
    }));
  }

  // Engagement Metrics Methods
  private async getOverallEngagement(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'totalInteractions')
      .addSelect('COUNT(DISTINCT event.userId)', 'uniqueUsers')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere(
        'event.eventType IN ("article_like", "comment_create", "article_share", "reaction_set", "bookmark_create")',
      )
      .getRawOne();

    const totalInteractions = parseInt(result.totalInteractions) || 0;
    const uniqueUsers = parseInt(result.uniqueUsers) || 0;

    return {
      totalInteractions,
      engagementRate:
        uniqueUsers > 0 ? (totalInteractions / uniqueUsers) * 100 : 0,
      averageEngagementPerUser:
        uniqueUsers > 0 ? totalInteractions / uniqueUsers : 0,
    };
  }

  private async getEngagementBreakdown(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere(
        'event.eventType IN ("article_like", "comment_create", "article_share", "reaction_set", "bookmark_create")',
      )
      .groupBy('event.eventType')
      .getRawMany();

    const breakdown = {
      likes: 0,
      comments: 0,
      shares: 0,
      bookmarks: 0,
      reactions: 0,
    };

    result.forEach((item) => {
      const count = parseInt(item.count);
      switch (item.type) {
        case 'article_like':
          breakdown.likes = count;
          break;
        case 'comment_create':
          breakdown.comments = count;
          break;
        case 'article_share':
          breakdown.shares = count;
          break;
        case 'bookmark_create':
          breakdown.bookmarks = count;
          break;
        case 'reaction_set':
          breakdown.reactions = count;
          break;
      }
    });

    return breakdown;
  }

  private async getTopEngagementSources(dateCondition: any) {
    // Simplified engagement sources
    return [];
  }

  private async getEngagementTrends(dateCondition: any, granularity: string) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(this.getDateTruncate(granularity), 'date')
      .addSelect('COUNT(*)', 'totalEngagement')
      .addSelect('COUNT(DISTINCT event.userId)', 'uniqueUsers')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere(
        'event.eventType IN ("article_like", "comment_create", "article_share", "reaction_set", "bookmark_create")',
      )
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      totalEngagement: parseInt(item.totalEngagement),
      engagementRate:
        parseInt(item.uniqueUsers) > 0
          ? (parseInt(item.totalEngagement) / parseInt(item.uniqueUsers)) * 100
          : 0,
    }));
  }

  private async getUserEngagementSegments(dateCondition: any) {
    // Simplified user engagement segments
    return [];
  }

  // Traffic Sources Methods
  private async getTotalTraffic(dateCondition: any): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.eventType = "page_view"')
      .getRawOne();
    return parseInt(result.count) || 0;
  }

  private async getTrafficSources(dateCondition: any) {
    // Simplified traffic sources
    return [];
  }

  private async getReferrers(dateCondition: any) {
    // Simplified referrers
    return [];
  }

  private async getDeviceBreakdown(dateCondition: any) {
    // Simplified device breakdown
    return [];
  }

  private async getBrowserBreakdown(dateCondition: any) {
    // Simplified browser breakdown
    return [];
  }

  private async getTrafficTimeSeries(dateCondition: any, granularity: string) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select(this.getDateTruncate(granularity), 'date')
      .addSelect('COUNT(*)', 'totalTraffic')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.eventType = "page_view"')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      totalTraffic: parseInt(item.totalTraffic),
      organicTraffic: 0, // Would need referrer analysis
      directTraffic: 0,
      referralTraffic: 0,
    }));
  }

  // Geographic Data Methods
  private async getTotalCountries(dateCondition: any): Promise<number> {
    // Simplified - would need IP geolocation
    return 0;
  }

  private async getTopCountries(dateCondition: any) {
    // Simplified - would need IP geolocation
    return [];
  }

  private async getTopCities(dateCondition: any) {
    // Simplified - would need IP geolocation
    return [];
  }

  private async getGeographicDistribution(dateCondition: any) {
    // Simplified - would need IP geolocation
    return [];
  }

  private async getGeographicTimeSeries(
    dateCondition: any,
    granularity: string,
  ) {
    // Simplified - would need IP geolocation
    return [];
  }

  // Conversion Funnel Methods
  private async getFunnelSteps(dateCondition: any) {
    // Simplified funnel steps
    return [];
  }

  private async getOverallConversion(dateCondition: any): Promise<number> {
    // Simplified conversion rate
    return 0;
  }

  private async getTopConversionPaths(dateCondition: any) {
    // Simplified conversion paths
    return [];
  }

  private async getConversionTrends(dateCondition: any, granularity: string) {
    // Simplified conversion trends
    return [];
  }

  private async getFunnelBottlenecks(dateCondition: any) {
    // Simplified funnel bottlenecks
    return [];
  }

  // Retention Analysis Methods
  private async getCohortAnalysis(dateCondition: any) {
    // Simplified cohort analysis
    return [];
  }

  private async getRetentionRates(dateCondition: any) {
    // Simplified retention rates
    return {
      day1: 0,
      day7: 0,
      day30: 0,
    };
  }

  private async getRetentionTrends(dateCondition: any, granularity: string) {
    // Simplified retention trends
    return [];
  }

  private async getChurnAnalysis(dateCondition: any) {
    // Simplified churn analysis
    return {
      churnRate: 0,
      churnedUsers: 0,
      churnTrend: 'stable' as const,
    };
  }

  // Revenue Metrics Methods
  private async getTotalRevenue(dateCondition: any): Promise<number> {
    // Simplified revenue calculation
    return 0;
  }

  private async getRevenueBreakdown(dateCondition: any) {
    // Simplified revenue breakdown
    return [];
  }

  private async getRevenueTrends(dateCondition: any, granularity: string) {
    // Simplified revenue trends
    return [];
  }

  private async getTopRevenueGenerators(dateCondition: any) {
    // Simplified revenue generators
    return [];
  }

  private async getConversionMetrics(dateCondition: any) {
    // Simplified conversion metrics
    return {
      revenuePerUser: 0,
      revenuePerSession: 0,
      conversionRate: 0,
    };
  }

  // Helper method for date truncation
  private getDateTruncate(granularity: string): string {
    switch (granularity) {
      case 'hour':
        return "DATE_TRUNC('hour', event.createdAt)";
      case 'day':
        return "DATE_TRUNC('day', event.createdAt)";
      case 'week':
        return "DATE_TRUNC('week', event.createdAt)";
      case 'month':
        return "DATE_TRUNC('month', event.createdAt)";
      case 'quarter':
        return "DATE_TRUNC('quarter', event.createdAt)";
      case 'year':
        return "DATE_TRUNC('year', event.createdAt)";
      default:
        return "DATE_TRUNC('day', event.createdAt)";
    }
  }
}
