import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';

/**
 * Dashboard Widget Query DTO
 *
 * Specialized DTO for individual dashboard widgets
 */
export class DashboardWidgetQueryDto extends AdvancedPaginationDto {
  /**
   * Start date for analytics data filtering
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare fromDate?: Date;

  /**
   * End date for analytics data filtering
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare toDate?: Date;

  /**
   * Widget type identifier
   */
  @IsOptional()
  @IsString()
  @IsIn([
    'overview',
    'user_activity',
    'content_performance',
    'engagement_metrics',
    'traffic_sources',
    'device_analytics',
    'geographic_data',
    'conversion_funnel',
    'retention_analysis',
    'revenue_metrics',
  ])
  widgetType?: string;

  /**
   * Granularity for time-based aggregations
   */
  @IsOptional()
  @IsString()
  @IsIn(['hour', 'day', 'week', 'month', 'quarter', 'year'])
  granularity?: string = 'day';

  /**
   * Number of data points to return
   */
  @IsOptional()
  @IsNumber()
  dataPoints?: number = 30;

  /**
   * Include comparison with previous period
   */
  @IsOptional()
  @IsBoolean()
  includeComparison?: boolean = false;

  /**
   * Comparison period type
   */
  @IsOptional()
  @IsString()
  @IsIn(['previous_period', 'same_period_last_year', 'custom'])
  comparisonType?: string = 'previous_period';
}

/**
 * Real-time Analytics Query DTO
 */
export class RealTimeAnalyticsQueryDto {
  /**
   * Time window for real-time data (in minutes)
   */
  @IsOptional()
  @IsNumber()
  timeWindow?: number = 60; // 1 hour default

  /**
   * Refresh interval (in seconds)
   */
  @IsOptional()
  @IsNumber()
  refreshInterval?: number = 30; // 30 seconds default

  /**
   * Event types to monitor
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: string | string[] }): string[] => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    return value;
  })
  eventTypes?: string[];

  /**
   * Include live user count
   */
  @IsOptional()
  @IsBoolean()
  includeLiveUsers?: boolean = true;

  /**
   * Include live events stream
   */
  @IsOptional()
  @IsBoolean()
  includeLiveEvents?: boolean = false;
}

/**
 * Analytics Export Query DTO
 */
export class AnalyticsExportQueryDto extends AdvancedPaginationDto {
  /**
   * Start date for export
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare fromDate?: Date;

  /**
   * End date for export
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare toDate?: Date;

  /**
   * Export format
   */
  @IsOptional()
  @IsString()
  @IsIn(['csv', 'json', 'xlsx', 'pdf'])
  format?: string = 'csv';

  /**
   * Include raw data
   */
  @IsOptional()
  @IsBoolean()
  includeRawData?: boolean = false;

  /**
   * Include aggregated data
   */
  @IsOptional()
  @IsBoolean()
  includeAggregatedData?: boolean = true;

  /**
   * Include charts data
   */
  @IsOptional()
  @IsBoolean()
  includeChartsData?: boolean = false;
}
