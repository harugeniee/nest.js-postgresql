import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import {
  ReportStatus,
  ReportPriority,
  ReportableType,
  ReportReason,
  REPORT_CONSTANTS,
} from 'src/shared/constants';

/**
 * DTO for report statistics query parameters
 */
export class ReportStatsDto {
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.STATUS)
  status?: ReportStatus = REPORT_CONSTANTS.STATUS.PENDING;

  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.PRIORITY)
  priority?: ReportPriority = REPORT_CONSTANTS.PRIORITY.MEDIUM;

  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.REPORTABLE_TYPES)
  reportableType?: ReportableType = REPORT_CONSTANTS.REPORTABLE_TYPES.ARTICLE;

  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.REASONS)
  reason?: ReportReason = REPORT_CONSTANTS.REASONS.SPAM;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  moderatorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'year'])
  groupBy?: 'hour' | 'day' | 'week' | 'month' | 'year';
}

/**
 * DTO for basic report counts response
 */
export class BasicReportCountsDto {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
}

/**
 * DTO for report field statistics response
 */
export class ReportFieldStatsDto {
  reportsByStatus: Record<ReportStatus, number>;
  reportsByPriority: Record<ReportPriority, number>;
  reportsByType: Record<ReportableType, number>;
  reportsByReason: Record<ReportReason, number>;
}

/**
 * DTO for top users response
 */
export class TopUsersDto {
  userId: string;
  count: number;
}

/**
 * DTO for top moderators response
 */
export class TopModeratorsDto {
  moderatorId: string;
  count: number;
}

/**
 * DTO for recent trends response
 */
export class RecentTrendsDto {
  date: string;
  count: number;
}

/**
 * DTO for complete report statistics response
 */
export class ReportStatsResponseDto {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
  reportsByStatus: Record<ReportStatus, number>;
  reportsByPriority: Record<ReportPriority, number>;
  reportsByType: Record<ReportableType, number>;
  reportsByReason: Record<ReportReason, number>;
  averageResolutionTime: number;
  topUsers: TopUsersDto[];
  topModerators: TopModeratorsDto[];
  recentTrends: RecentTrendsDto[];
}
