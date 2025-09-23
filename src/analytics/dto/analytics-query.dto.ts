import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';

/**
 * Analytics Query DTO
 *
 * Data transfer object for analytics query parameters
 * Extends AdvancedPaginationDto for pagination and filtering capabilities
 */
export class AnalyticsQueryDto extends AdvancedPaginationDto {
  /**
   * Start date for analytics data filtering
   * Format: YYYY-MM-DD or ISO 8601 date string
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare fromDate?: Date;

  /**
   * End date for analytics data filtering
   * Format: YYYY-MM-DD or ISO 8601 date string
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  declare toDate?: Date;

  /**
   * Event type filter - can be a single event type or comma-separated list
   * Examples: 'article_view' or 'article_view,user_follow,reaction_set'
   */
  @IsOptional()
  @IsString()
  eventType?: string;

  /**
   * Event category filter - can be a single category or comma-separated list
   * Examples: 'content' or 'content,social,engagement'
   */
  @IsOptional()
  @IsString()
  eventCategory?: string;

  /**
   * Subject type filter - can be a single type or comma-separated list
   * Examples: 'article' or 'article,comment,user'
   */
  @IsOptional()
  @IsString()
  subjectType?: string;

  /**
   * Granularity for time-based aggregations
   * Options: 'hour', 'day', 'week', 'month'
   */
  @IsOptional()
  @IsString()
  @IsIn(['hour', 'day', 'week', 'month'])
  granularity?: string = 'day';
}
