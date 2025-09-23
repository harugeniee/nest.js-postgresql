import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { TrackEventDto } from './dto/track-event.dto';
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
   * Get user analytics for a specific time range
   *
   * @param userId - ID of the user
   * @param timeRange - Time range for analytics (1d, 7d, 30d, 90d)
   * @returns User analytics data
   */
  async getUserAnalytics(userId: string, timeRange: string = '30d') {
    const startDate = this.getStartDate(timeRange);

    // Use direct repository query for time-based filtering
    const events = await this.analyticsEventRepository.find({
      where: {
        userId,
        createdAt: MoreThan(startDate),
      },
      order: {
        createdAt: 'DESC',
      },
      take: 1000,
    });

    return this.aggregateUserEvents(events);
  }

  /**
   * Get content performance metrics
   *
   * @param subjectType - Type of content (article, comment, etc.)
   * @param subjectId - ID of the content
   * @param timeRange - Time range for analytics
   * @returns Content performance data
   */
  async getContentPerformance(
    subjectType: string,
    subjectId: string,
    timeRange: string = '30d',
  ) {
    const startDate = this.getStartDate(timeRange);

    const metrics = await this.analyticsMetricRepository
      .createQueryBuilder('metric')
      .where('metric.subjectType = :subjectType', { subjectType })
      .andWhere('metric.subjectId = :subjectId', { subjectId })
      .andWhere('metric.dateKey >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .getMany();

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
   * Get start date for time range
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
}
