import { IsOptional, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShareMetricsDto {
  /**
   * Start date for metrics (ISO 8601 format)
   * Defaults to 30 days ago
   */
  @IsOptional()
  @IsDateString()
  from?: string;

  /**
   * End date for metrics (ISO 8601 format)
   * Defaults to today
   */
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ShareMetricsResponseDto {
  /**
   * Total clicks in the period
   */
  clicks: number;

  /**
   * Total unique visitors in the period
   */
  uniques: number;

  /**
   * Total conversions in the period
   */
  conversions: number;

  /**
   * Total conversion value in the period
   */
  conversionValue: number;

  /**
   * Top referrers in the period
   */
  topReferrers: Array<{
    referrer: string;
    clicks: number;
  }>;

  /**
   * Geographic distribution in the period
   */
  geoDistribution: Array<{
    country: string;
    clicks: number;
  }>;

  /**
   * Daily breakdown
   */
  dailyBreakdown: Array<{
    date: string;
    clicks: number;
    uniques: number;
    conversions: number;
    conversionValue: number;
  }>;
}
