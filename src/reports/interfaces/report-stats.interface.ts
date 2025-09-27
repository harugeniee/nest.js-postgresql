import {
  ReportStatus,
  ReportPriority,
  ReportableType,
  ReportReason,
} from 'src/shared/constants';

/**
 * Interface for report statistics response
 */
export interface ReportStatsResponse {
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
  topUsers: Array<{ userId: string; count: number }>;
  topModerators: Array<{ moderatorId: string; count: number }>;
  recentTrends: Array<{ date: string; count: number }>;
}

/**
 * Interface for basic report counts
 */
export interface BasicReportCounts {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
}

/**
 * Interface for report field statistics
 */
export interface ReportFieldStats {
  reportsByStatus: Record<ReportStatus, number>;
  reportsByPriority: Record<ReportPriority, number>;
  reportsByType: Record<ReportableType, number>;
  reportsByReason: Record<ReportReason, number>;
}

/**
 * Interface for top users/moderators
 */
export interface TopUser {
  userId: string;
  count: number;
}

export interface TopModerator {
  moderatorId: string;
  count: number;
}

/**
 * Interface for recent trends
 */
export interface RecentTrend {
  date: string;
  count: number;
}

/**
 * Interface for statistics calculation parameters
 */
export interface StatsCalculationParams {
  whereCondition: Record<string, unknown>;
  groupBy?: 'hour' | 'day' | 'week' | 'month' | 'year';
}
