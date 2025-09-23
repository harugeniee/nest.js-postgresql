import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, In } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { CacheService } from 'src/shared/services';

/**
 * Analytics Service
 *
 * Service for tracking and analyzing user events and interactions
 * Extends BaseService for common CRUD operations and caching
 */
@Injectable()
export class AnalyticsService extends BaseService<AnalyticsEvent> {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsMetric)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetric>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<AnalyticsEvent>(analyticsEventRepository),
      {
        entityName: 'AnalyticsEvent',
        cache: {
          enabled: true,
          prefix: 'analytics',
          ttlSec: 300, // 5 minutes
          swrSec: 60, // 1 minute
        },
        defaultSearchField: 'eventType',
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof AnalyticsEvent)[] {
    return ['eventType', 'eventCategory', 'subjectType'];
  }

  /**
   * Track a single analytics event
   *
   * @param trackEventDto - Event data to track
   * @param userId - ID of the user who triggered the event
   * @param sessionId - Session ID for tracking
   * @returns Created analytics event
   */
  async trackEvent(
    trackEventDto: TrackEventDto,
    userId?: string,
    sessionId?: string,
  ) {
    const event = this.analyticsEventRepository.create({
      userId,
      eventType: trackEventDto.eventType,
      eventCategory: trackEventDto.eventCategory,
      subjectType: trackEventDto.subjectType,
      subjectId: trackEventDto.subjectId,
      eventData: trackEventDto.eventData,
      sessionId,
    });

    const savedEvent = await this.analyticsEventRepository.save(event);

    // Update metrics asynchronously to avoid blocking the main flow
    void this.updateMetrics(trackEventDto);

    return savedEvent;
  }

  /**
   * Update metrics for an event
   *
   * @param trackEventDto - Event data to update metrics for
   */
  private async updateMetrics(trackEventDto: TrackEventDto) {
    const dateKey = new Date().toISOString().split('T')[0];
    const metricType = this.getMetricType(trackEventDto.eventType);

    if (!metricType || !trackEventDto.subjectType || !trackEventDto.subjectId)
      return;

    try {
      const existingMetric = await this.analyticsMetricRepository.findOne({
        where: {
          metricType,
          subjectType: trackEventDto.subjectType,
          subjectId: trackEventDto.subjectId,
          dateKey,
        },
      });

      if (existingMetric) {
        await this.analyticsMetricRepository.update(existingMetric.id, {
          metricValue: existingMetric.metricValue + 1,
          updatedAt: new Date(),
        });
      } else {
        await this.analyticsMetricRepository.save({
          metricType,
          subjectType: trackEventDto.subjectType,
          subjectId: trackEventDto.subjectId,
          metricValue: 1,
          dateKey,
        });
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  /**
   * Get user analytics for a specific date range
   *
   * @param userId - ID of the user
   * @param query - Query parameters including date range and filters
   * @returns User analytics data
   */
  async getUserAnalytics(userId: string, query: AnalyticsQueryDto) {
    const whereConditions: any = { userId };

    // Apply date range filtering
    if (query.fromDate || query.toDate) {
      if (query.fromDate && query.toDate) {
        whereConditions.createdAt = Between(query.fromDate, query.toDate);
      } else if (query.fromDate) {
        whereConditions.createdAt = MoreThan(query.fromDate);
      } else if (query.toDate) {
        whereConditions.createdAt = MoreThan(query.toDate);
      }
    } else {
      // Default to last 30 days if no date range specified
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      whereConditions.createdAt = MoreThan(defaultStartDate);
    }

    // Apply event type filtering
    if (query.eventType) {
      const eventTypes = query.eventType.split(',').map((type) => type.trim());
      whereConditions.eventType = In(eventTypes);
    }

    // Apply event category filtering
    if (query.eventCategory) {
      const eventCategories = query.eventCategory
        .split(',')
        .map((cat) => cat.trim());
      whereConditions.eventCategory = In(eventCategories);
    }

    // Apply subject type filtering
    if (query.subjectType) {
      const subjectTypes = query.subjectType
        .split(',')
        .map((type) => type.trim());
      whereConditions.subjectType = In(subjectTypes);
    }

    const events = await this.analyticsEventRepository.find({
      where: whereConditions,
      order: {
        createdAt: 'DESC',
      },
      take: query.limit || 1000,
      skip: ((query.page || 1) - 1) * (query.limit || 1000),
    });

    return this.aggregateUserEvents(events);
  }

  /**
   * Get content performance metrics
   *
   * @param subjectType - Type of content (article, comment, etc.)
   * @param subjectId - ID of the content
   * @param query - Query parameters including date range
   * @returns Content performance data
   */
  async getContentPerformance(
    subjectType: string,
    subjectId: string,
    query: AnalyticsQueryDto,
  ) {
    const queryBuilder = this.analyticsMetricRepository
      .createQueryBuilder('metric')
      .where('metric.subjectType = :subjectType', { subjectType })
      .andWhere('metric.subjectId = :subjectId', { subjectId });

    // Apply date range filtering
    if (query.fromDate || query.toDate) {
      if (query.fromDate && query.toDate) {
        queryBuilder.andWhere('metric.dateKey BETWEEN :fromDate AND :toDate', {
          fromDate: query.fromDate.toISOString().split('T')[0],
          toDate: query.toDate.toISOString().split('T')[0],
        });
      } else if (query.fromDate) {
        queryBuilder.andWhere('metric.dateKey >= :fromDate', {
          fromDate: query.fromDate.toISOString().split('T')[0],
        });
      } else if (query.toDate) {
        queryBuilder.andWhere('metric.dateKey <= :toDate', {
          toDate: query.toDate.toISOString().split('T')[0],
        });
      }
    } else {
      // Default to last 30 days if no date range specified
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      queryBuilder.andWhere('metric.dateKey >= :startDate', {
        startDate: defaultStartDate.toISOString().split('T')[0],
      });
    }

    const metrics = await queryBuilder.getMany();

    return this.aggregateContentMetrics(metrics);
  }

  /**
   * Get platform overview statistics
   *
   * @returns Platform overview data
   */
  async getPlatformOverview() {
    const totalEvents = await this.analyticsEventRepository.count();

    // Get unique user count using a simpler approach
    const uniqueUsers = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.userId')
      .where('event.userId IS NOT NULL')
      .getCount();

    return {
      totalEvents,
      totalUsers: uniqueUsers,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get metric type from event type
   *
   * @param eventType - Type of event
   * @returns Corresponding metric type
   */
  private getMetricType(eventType: string): string | null {
    const metricMap: Record<string, string> = {
      article_view: 'article_views',
      article_like: 'article_likes',
      article_comment: 'article_comments',
      article_share: 'article_shares',
      user_follow: 'user_follows',
      user_unfollow: 'user_unfollows',
      reaction_set: 'reaction_count',
      bookmark_create: 'bookmark_count',
      comment_create: 'comment_count',
    };
    return metricMap[eventType] || null;
  }

  /**
   * Get start date for time range (legacy support)
   *
   * @param timeRange - Time range string
   * @returns Start date
   */
  private getStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get dashboard overview analytics
   *
   * @param query - Dashboard query parameters
   * @returns Dashboard overview data
   */
  async getDashboardOverview(query: DashboardQueryDto) {
    const whereConditions: any = {};

    // Apply date range filtering
    if (query.fromDate || query.toDate) {
      if (query.fromDate && query.toDate) {
        whereConditions.createdAt = Between(query.fromDate, query.toDate);
      } else if (query.fromDate) {
        whereConditions.createdAt = MoreThan(query.fromDate);
      } else if (query.toDate) {
        whereConditions.createdAt = MoreThan(query.toDate);
      }
    } else {
      // Default to last 30 days if no date range specified
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      whereConditions.createdAt = MoreThan(defaultStartDate);
    }

    // Apply event type filtering
    if (query.eventTypes && query.eventTypes.length > 0) {
      whereConditions.eventType = In(query.eventTypes);
    }

    // Apply event category filtering
    if (query.eventCategories && query.eventCategories.length > 0) {
      whereConditions.eventCategory = In(query.eventCategories);
    }

    // Apply subject type filtering
    if (query.subjectTypes && query.subjectTypes.length > 0) {
      whereConditions.subjectType = In(query.subjectTypes);
    }

    // Apply user filtering
    if (query.userIds && query.userIds.length > 0) {
      whereConditions.userId = In(query.userIds);
    }

    // Handle anonymous events
    if (!query.includeAnonymous) {
      whereConditions.userId = MoreThan(0); // Exclude null userIds
    }

    const events = await this.analyticsEventRepository.find({
      where: whereConditions,
      order: {
        createdAt: 'DESC',
      },
      take: query.limit || 10000,
    });

    return this.aggregateDashboardEvents(events, query);
  }

  /**
   * Get analytics events with advanced filtering
   *
   * @param query - Analytics query parameters
   * @returns Filtered analytics events
   */
  async getAnalyticsEvents(query: AnalyticsQueryDto) {
    const whereConditions: any = {};

    // Apply date range filtering
    if (query.fromDate || query.toDate) {
      if (query.fromDate && query.toDate) {
        whereConditions.createdAt = Between(query.fromDate, query.toDate);
      } else if (query.fromDate) {
        whereConditions.createdAt = MoreThan(query.fromDate);
      } else if (query.toDate) {
        whereConditions.createdAt = MoreThan(query.toDate);
      }
    } else {
      // Default to last 30 days if no date range specified
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      whereConditions.createdAt = MoreThan(defaultStartDate);
    }

    // Apply event type filtering
    if (query.eventType) {
      const eventTypes = query.eventType.split(',').map((type) => type.trim());
      whereConditions.eventType = In(eventTypes);
    }

    // Apply event category filtering
    if (query.eventCategory) {
      const eventCategories = query.eventCategory
        .split(',')
        .map((cat) => cat.trim());
      whereConditions.eventCategory = In(eventCategories);
    }

    // Apply subject type filtering
    if (query.subjectType) {
      const subjectTypes = query.subjectType
        .split(',')
        .map((type) => type.trim());
      whereConditions.subjectType = In(subjectTypes);
    }

    // Apply user filtering
    if (query.userId) {
      whereConditions.userId = query.userId;
    }

    const [events, total] = await this.analyticsEventRepository.findAndCount({
      where: whereConditions,
      order: {
        [query.sortBy || 'createdAt']: query.order || 'DESC',
      },
      take: query.limit || 100,
      skip: ((query.page || 1) - 1) * (query.limit || 100),
    });

    return {
      events,
      total,
      page: query.page || 1,
      limit: query.limit || 100,
      totalPages: Math.ceil(total / (query.limit || 100)),
    };
  }

  /**
   * Aggregate user events into analytics data
   *
   * @param events - Array of user events
   * @returns Aggregated user analytics
   */
  private aggregateUserEvents(events: AnalyticsEvent[]) {
    const aggregated = {
      totalEvents: events.length,
      eventTypes: {} as Record<string, number>,
      contentInteractions: 0,
      socialInteractions: 0,
    };

    events.forEach((event) => {
      aggregated.eventTypes[event.eventType] =
        (aggregated.eventTypes[event.eventType] || 0) + 1;

      if (
        ['article_view', 'article_like', 'article_comment'].includes(
          event.eventType,
        )
      ) {
        aggregated.contentInteractions++;
      }

      if (
        ['user_follow', 'user_unfollow', 'reaction_set'].includes(
          event.eventType,
        )
      ) {
        aggregated.socialInteractions++;
      }
    });

    return aggregated;
  }

  /**
   * Aggregate content metrics into performance data
   *
   * @param metrics - Array of content metrics
   * @returns Aggregated content performance
   */
  private aggregateContentMetrics(metrics: AnalyticsMetric[]) {
    const aggregated = {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    };

    metrics.forEach((metric) => {
      switch (metric.metricType) {
        case 'article_views':
          aggregated.totalViews += metric.metricValue;
          break;
        case 'article_likes':
          aggregated.totalLikes += metric.metricValue;
          break;
        case 'article_comments':
          aggregated.totalComments += metric.metricValue;
          break;
        case 'article_shares':
          aggregated.totalShares += metric.metricValue;
          break;
      }
    });

    return aggregated;
  }

  /**
   * Aggregate dashboard events into comprehensive analytics data
   *
   * @param events - Array of analytics events
   * @param query - Dashboard query parameters
   * @returns Aggregated dashboard analytics
   */
  private aggregateDashboardEvents(
    events: AnalyticsEvent[],
    query: DashboardQueryDto,
  ) {
    const aggregated = {
      totalEvents: events.length,
      uniqueUsers: new Set<string>(),
      eventTypes: {} as Record<string, number>,
      eventCategories: {} as Record<string, number>,
      subjectTypes: {} as Record<string, number>,
      contentInteractions: 0,
      socialInteractions: 0,
      systemInteractions: 0,
      engagementInteractions: 0,
      timeSeries: [] as Array<{ date: string; count: number }>,
      topUsers: {} as Record<string, number>,
      topContent: {} as Record<string, number>,
    };

    // Group events by granularity for time series
    const timeGroups: Record<string, number> = {};
    const userGroups: Record<string, number> = {};
    const contentGroups: Record<string, number> = {};

    events.forEach((event) => {
      // Count unique users
      if (event.userId) {
        aggregated.uniqueUsers.add(event.userId);
        userGroups[event.userId] = (userGroups[event.userId] || 0) + 1;
      }

      // Count event types
      aggregated.eventTypes[event.eventType] =
        (aggregated.eventTypes[event.eventType] || 0) + 1;

      // Count event categories
      aggregated.eventCategories[event.eventCategory] =
        (aggregated.eventCategories[event.eventCategory] || 0) + 1;

      // Count subject types
      if (event.subjectType) {
        aggregated.subjectTypes[event.subjectType] =
          (aggregated.subjectTypes[event.subjectType] || 0) + 1;

        // Count content interactions
        const contentKey = `${event.subjectType}:${event.subjectId}`;
        contentGroups[contentKey] = (contentGroups[contentKey] || 0) + 1;
      }

      // Categorize interactions
      if (
        ['article_view', 'article_like', 'article_comment'].includes(
          event.eventType,
        )
      ) {
        aggregated.contentInteractions++;
      } else if (['user_follow', 'user_unfollow'].includes(event.eventType)) {
        aggregated.socialInteractions++;
      } else if (['page_view', 'system_event'].includes(event.eventType)) {
        aggregated.systemInteractions++;
      } else if (
        ['reaction_set', 'bookmark_create'].includes(event.eventType)
      ) {
        aggregated.engagementInteractions++;
      }

      // Group by time granularity
      const eventDate = new Date(event.createdAt);
      let timeKey: string;

      switch (query.granularity) {
        case 'hour':
          timeKey = eventDate.toISOString().slice(0, 13) + ':00:00';
          break;
        case 'week': {
          const weekStart = new Date(eventDate);
          weekStart.setDate(eventDate.getDate() - eventDate.getDay());
          timeKey = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          timeKey = eventDate.toISOString().slice(0, 7);
          break;
        default: // day
          timeKey = eventDate.toISOString().split('T')[0];
      }

      timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
    });

    // Convert time groups to array
    aggregated.timeSeries = Object.entries(timeGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top users
    aggregated.topUsers = Object.fromEntries(
      Object.entries(userGroups)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    );

    // Get top content
    aggregated.topContent = Object.fromEntries(
      Object.entries(contentGroups)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    );

    return {
      ...aggregated,
      uniqueUsers: aggregated.uniqueUsers.size,
    };
  }
}
