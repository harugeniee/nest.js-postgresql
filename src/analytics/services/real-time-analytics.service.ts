import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import {
  RealTimeAnalyticsQueryDto,
  RealTimeAnalyticsResponseDto,
} from '../dto/dashboard-response.dto';
import { EventEmitter } from 'events';

/**
 * Real-time Analytics Service
 *
 * Service for providing real-time analytics data and live event streaming
 */
@Injectable()
export class RealTimeAnalyticsService {
  private readonly activeConnections = new Map<string, any>();
  private readonly eventEmitter: EventEmitter;
  private liveEventBuffer: Array<{
    id: string;
    eventType: string;
    userId?: string;
    timestamp: Date;
    eventData?: any;
  }> = [];

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
  ) {
    this.eventEmitter = new EventEmitter();
    // Initialize live event buffer with max 100 events
    this.liveEventBuffer = [];
  }

  /**
   * Get real-time analytics data
   */
  async getRealTimeAnalytics(
    query: RealTimeAnalyticsQueryDto,
  ): Promise<RealTimeAnalyticsResponseDto> {
    const timeWindow = query.timeWindow || 60; // minutes
    const startTime = new Date(Date.now() - timeWindow * 60 * 1000);

    const [activeUsers, eventsInWindow, topEvents, liveEvents] =
      await Promise.all([
        this.getActiveUsers(startTime),
        this.getEventsInWindow(startTime),
        this.getTopEvents(startTime, query.eventTypes),
        query.includeLiveEvents ? this.getLiveEvents() : undefined,
      ]);

    const nextUpdate = new Date(
      Date.now() + (query.refreshInterval || 30) * 1000,
    );

    return {
      timestamp: new Date(),
      activeUsers,
      eventsInWindow,
      topEvents,
      liveEvents,
      metadata: {
        timeWindow,
        refreshInterval: query.refreshInterval || 30,
        nextUpdate,
      },
    };
  }

  /**
   * Start real-time analytics streaming for a connection
   */
  startRealTimeStreaming(
    connectionId: string,
    query: RealTimeAnalyticsQueryDto,
  ) {
    this.activeConnections.set(connectionId, {
      query,
      lastUpdate: new Date(),
      isActive: true,
    });

    // Emit initial data
    this.emitRealTimeData(connectionId);
  }

  /**
   * Stop real-time analytics streaming for a connection
   */
  stopRealTimeStreaming(connectionId: string) {
    this.activeConnections.delete(connectionId);
  }

  /**
   * Process new analytics event for real-time updates
   */
  async processLiveEvent(event: AnalyticsEvent) {
    // Add to live event buffer
    this.liveEventBuffer.unshift({
      id: event.id,
      eventType: event.eventType,
      userId: event.userId,
      timestamp: event.createdAt,
      eventData: event.eventData,
    });

    // Keep only last 100 events
    if (this.liveEventBuffer.length > 100) {
      this.liveEventBuffer = this.liveEventBuffer.slice(0, 100);
    }

    // Emit to all active connections
    this.eventEmitter.emit('analytics.liveEvent', {
      event: this.liveEventBuffer[0],
      timestamp: new Date(),
    });

    // Update all active connections
    this.updateActiveConnections();
  }

  /**
   * Get active users in the specified time window
   */
  private async getActiveUsers(startTime: Date): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt >= :startTime', { startTime })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Get total events in the specified time window
   */
  private async getEventsInWindow(startTime: Date): Promise<number> {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(*)', 'count')
      .where('event.createdAt >= :startTime', { startTime })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Get top events in the specified time window
   */
  private async getTopEvents(
    startTime: Date,
    eventTypes?: string[],
  ): Promise<Array<{ eventType: string; count: number; percentage: number }>> {
    let query = this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startTime', { startTime })
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .limit(10);

    if (eventTypes && eventTypes.length > 0) {
      query = query.andWhere('event.eventType IN (:...eventTypes)', {
        eventTypes,
      });
    }

    const result = await query.getRawMany();
    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map((item) => ({
      eventType: item.eventType,
      count: parseInt(item.count),
      percentage: total > 0 ? (parseInt(item.count) / total) * 100 : 0,
    }));
  }

  /**
   * Get live events from buffer
   */
  private getLiveEvents(): Array<{
    id: string;
    eventType: string;
    userId?: string;
    timestamp: Date;
    eventData?: any;
  }> {
    return this.liveEventBuffer.slice(0, 20); // Return last 20 events
  }

  /**
   * Emit real-time data to a specific connection
   */
  private async emitRealTimeData(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection?.isActive) return;

    try {
      const data = await this.getRealTimeAnalytics(connection.query);
      this.eventEmitter.emit(`analytics.realTime.${connectionId}`, data);
    } catch (error) {
      console.error('Error emitting real-time data:', error);
    }
  }

  /**
   * Update all active connections with new data
   */
  private updateActiveConnections() {
    this.activeConnections.forEach((connection, connectionId) => {
      if (connection.isActive) {
        this.emitRealTimeData(connectionId);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      activeConnections: this.activeConnections.size,
      liveEventBufferSize: this.liveEventBuffer.length,
      lastEventTime:
        this.liveEventBuffer.length > 0
          ? this.liveEventBuffer[0].timestamp
          : null,
    };
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    this.activeConnections.forEach((connection, connectionId) => {
      const timeSinceLastUpdate =
        now.getTime() - connection.lastUpdate.getTime();
      if (timeSinceLastUpdate > inactiveThreshold) {
        this.activeConnections.delete(connectionId);
      }
    });
  }

  /**
   * Get real-time metrics summary
   */
  async getRealTimeMetricsSummary() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastMinute = new Date(now.getTime() - 60 * 1000);

    const [
      eventsLastHour,
      eventsLastMinute,
      activeUsersLastHour,
      activeUsersLastMinute,
    ] = await Promise.all([
      this.getEventsInWindow(lastHour),
      this.getEventsInWindow(lastMinute),
      this.getActiveUsers(lastHour),
      this.getActiveUsers(lastMinute),
    ]);

    return {
      eventsLastHour,
      eventsLastMinute,
      activeUsersLastHour,
      activeUsersLastMinute,
      eventsPerMinute: eventsLastMinute,
      usersPerMinute: activeUsersLastMinute,
      timestamp: now,
    };
  }
}
