import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AnalyticsMetric } from '../entities/analytics-metric.entity';
import { RealTimeAnalyticsService } from './real-time-analytics.service';
import { AnalyticsRealtimeGateway } from '../gateways/analytics-realtime.gateway';

/**
 * Analytics Scheduler Service
 *
 * Service for scheduled analytics tasks and maintenance
 */
@Injectable()
export class AnalyticsSchedulerService {
  private readonly logger = new Logger(AnalyticsSchedulerService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsMetric)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetric>,
    private readonly realTimeAnalyticsService: RealTimeAnalyticsService,
    private readonly analyticsRealtimeGateway: AnalyticsRealtimeGateway,
  ) {}

  /**
   * Update daily metrics - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateHourlyMetrics() {
    try {
      this.logger.log('Starting hourly metrics update...');

      const now = new Date();
      const hourStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
      );

      // Get events from the last hour
      const events = await this.analyticsEventRepository.find({
        where: {
          createdAt: LessThan(now),
        },
        take: 1000, // Process in batches
      });

      // Update metrics for each event
      for (const event of events) {
        await this.updateEventMetrics(event);
      }

      this.logger.log(`Updated metrics for ${events.length} events`);
    } catch (error) {
      this.logger.error('Error updating hourly metrics:', error);
    }
  }

  /**
   * Clean up old analytics data - runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldData() {
    try {
      this.logger.log('Starting analytics data cleanup...');

      // Delete events older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await this.analyticsEventRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old analytics events`);
    } catch (error) {
      this.logger.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Update real-time analytics - runs every 30 seconds
   */
  @Cron('*/30 * * * * *')
  async updateRealTimeAnalytics() {
    try {
      // Get real-time metrics summary
      const metrics =
        await this.realTimeAnalyticsService.getRealTimeMetricsSummary();

      // Broadcast to all connected clients
      await this.analyticsRealtimeGateway.broadcastAnalyticsData({
        type: 'metrics_update',
        data: metrics,
      });
    } catch (error) {
      this.logger.error('Error updating real-time analytics:', error);
    }
  }

  /**
   * Clean up inactive real-time connections - runs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async cleanupInactiveConnections() {
    try {
      this.realTimeAnalyticsService.cleanupInactiveConnections();

      const stats = this.realTimeAnalyticsService.getConnectionStats();
      this.logger.log(
        `Active real-time connections: ${stats.activeConnections}`,
      );
    } catch (error) {
      this.logger.error('Error cleaning up inactive connections:', error);
    }
  }

  /**
   * Generate daily analytics report - runs daily at 6 AM
   */
  @Cron('0 6 * * *')
  async generateDailyReport() {
    try {
      this.logger.log('Generating daily analytics report...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get daily metrics
      const dailyMetrics = await this.getDailyMetrics(yesterday, today);

      this.logger.log('Daily analytics report generated:', dailyMetrics);

      // Could send report via email or store in database
      // await this.sendDailyReport(dailyMetrics);
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
    }
  }

  /**
   * Update metrics for a specific event
   */
  private async updateEventMetrics(event: AnalyticsEvent) {
    try {
      const dateKey = event.createdAt.toISOString().split('T')[0];
      const metricType = this.getMetricType(event.eventType);

      if (!metricType || !event.subjectType || !event.subjectId) {
        return;
      }

      // Check if metric already exists
      const existingMetric = await this.analyticsMetricRepository.findOne({
        where: {
          metricType,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          dateKey,
        },
      });

      if (existingMetric) {
        // Update existing metric
        await this.analyticsMetricRepository.update(existingMetric.id, {
          metricValue: existingMetric.metricValue + 1,
          updatedAt: new Date(),
        });
      } else {
        // Create new metric
        await this.analyticsMetricRepository.save({
          metricType,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          metricValue: 1,
          dateKey,
        });
      }
    } catch (error) {
      this.logger.error('Error updating event metrics:', error);
    }
  }

  /**
   * Get metric type from event type
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
   * Get daily metrics for reporting
   */
  private async getDailyMetrics(startDate: Date, endDate: Date) {
    const [totalEvents, uniqueUsers, topEventTypes, topContent] =
      await Promise.all([
        this.getTotalEvents(startDate, endDate),
        this.getUniqueUsers(startDate, endDate),
        this.getTopEventTypes(startDate, endDate),
        this.getTopContent(startDate, endDate),
      ]);

    return {
      date: startDate.toISOString().split('T')[0],
      totalEvents,
      uniqueUsers,
      topEventTypes,
      topContent,
      generatedAt: new Date(),
    };
  }

  private async getTotalEvents(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere('event.createdAt < :endDate', { endDate })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  private async getUniqueUsers(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere('event.createdAt < :endDate', { endDate })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  private async getTopEventTypes(startDate: Date, endDate: Date) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere('event.createdAt < :endDate', { endDate })
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      eventType: item.eventType,
      count: parseInt(item.count),
    }));
  }

  private async getTopContent(startDate: Date, endDate: Date) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.subjectType', 'subjectType')
      .addSelect('event.subjectId', 'subjectId')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere('event.createdAt < :endDate', { endDate })
      .andWhere('event.subjectType IS NOT NULL')
      .andWhere('event.subjectId IS NOT NULL')
      .groupBy('event.subjectType, event.subjectId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      count: parseInt(item.count),
    }));
  }
}
