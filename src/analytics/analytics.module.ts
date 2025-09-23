import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';

/**
 * Analytics Module
 *
 * Module for analytics tracking and reporting functionality
 */
@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsMetric])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsInterceptor],
  exports: [AnalyticsService, AnalyticsInterceptor],
})
export class AnalyticsModule {}
