import { IsOptional, IsString, IsIn } from 'class-validator';

/**
 * Analytics Query DTO
 *
 * Data transfer object for analytics query parameters
 */
export class AnalyticsQueryDto {
  /**
   * Time range for analytics data
   * Options: '1d', '7d', '30d', '90d'
   */
  @IsOptional()
  @IsString()
  @IsIn(['1d', '7d', '30d', '90d'])
  timeRange?: string = '30d';
}
