import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';

/**
 * Dashboard Query DTO
 *
 * Specialized DTO for dashboard analytics queries with additional filtering options
 */
export class DashboardQueryDto extends AdvancedPaginationDto {
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
   * Granularity for time-based aggregations
   * Options: 'hour', 'day', 'week', 'month'
   */
  @IsOptional()
  @IsString()
  @IsIn(['hour', 'day', 'week', 'month'])
  granularity?: string = 'day';

  /**
   * Event types to include in the analysis
   * Can be comma-separated string or array
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
   * Event categories to include in the analysis
   * Can be comma-separated string or array
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
  eventCategories?: string[];

  /**
   * Subject types to include in the analysis
   * Can be comma-separated string or array
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
  subjectTypes?: string[];

  /**
   * User IDs to filter by
   * Can be comma-separated string or array
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
  userIds?: string[];

  /**
   * Include anonymous events in the analysis
   * Default: true
   */
  @IsOptional()
  includeAnonymous?: boolean = true;

  /**
   * Group results by specific field
   * Options: 'eventType', 'eventCategory', 'subjectType', 'userId', 'date'
   */
  @IsOptional()
  @IsString()
  @IsIn(['eventType', 'eventCategory', 'subjectType', 'userId', 'date'])
  groupBy?: string;
}
