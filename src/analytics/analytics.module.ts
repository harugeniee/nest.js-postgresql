import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { RabbitmqModule } from 'src/shared/services/rabbitmq/rabbitmq.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';

/**
 * Analytics Module
 *
 * Module for analytics tracking and reporting functionality
 * Includes dashboard widgets, real-time analytics, and data export capabilities
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsMetric]),
    RabbitmqModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsInterceptor],
  exports: [AnalyticsService, AnalyticsInterceptor],
})
export class AnalyticsModule {}
