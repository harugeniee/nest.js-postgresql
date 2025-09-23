import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { AnalyticsWidgetsService } from './services/analytics-widgets.service';
import { RealTimeAnalyticsService } from './services/real-time-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { AnalyticsSchedulerService } from './services/analytics-scheduler.service';
import { AnalyticsRealtimeGateway } from './gateways/analytics-realtime.gateway';

/**
 * Analytics Module
 *
 * Module for analytics tracking and reporting functionality
 * Includes dashboard widgets, real-time analytics, and data export capabilities
 */
@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsMetric])],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsInterceptor,
    AnalyticsWidgetsService,
    RealTimeAnalyticsService,
    AnalyticsExportService,
    AnalyticsSchedulerService,
    AnalyticsRealtimeGateway,
  ],
  exports: [
    AnalyticsService,
    AnalyticsInterceptor,
    AnalyticsWidgetsService,
    RealTimeAnalyticsService,
    AnalyticsExportService,
    AnalyticsSchedulerService,
    AnalyticsRealtimeGateway,
  ],
})
export class AnalyticsModule {}
