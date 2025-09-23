/**
 * Analytics Response DTOs
 *
 * Response data transfer objects for analytics endpoints
 */

export class UserAnalyticsResponseDto {
  totalEvents: number;
  eventTypes: Record<string, number>;
  contentInteractions: number;
  socialInteractions: number;
}

export class ContentPerformanceResponseDto {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

export class PlatformOverviewResponseDto {
  totalEvents: number;
  totalUsers: number;
  lastUpdated: Date;
}

export class DashboardOverviewResponseDto {
  totalEvents: number;
  uniqueUsers: number;
  eventTypes: Record<string, number>;
  eventCategories: Record<string, number>;
  subjectTypes: Record<string, number>;
  contentInteractions: number;
  socialInteractions: number;
  systemInteractions: number;
  engagementInteractions: number;
  timeSeries: Array<{ date: string; count: number }>;
  topUsers: Record<string, number>;
  topContent: Record<string, number>;
}

export class AnalyticsEventsResponseDto {
  events: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AnalyticsTrendsResponseDto {
  timeSeries: Array<{ date: string; count: number }>;
  totalEvents: number;
  uniqueUsers: number;
  granularity: string;
}

export class TopContentResponseDto {
  topContent: Record<string, number>;
  contentInteractions: number;
  subjectTypes: Record<string, number>;
}

export class UserEngagementResponseDto {
  topUsers: Record<string, number>;
  uniqueUsers: number;
  socialInteractions: number;
  engagementInteractions: number;
  eventTypes: Record<string, number>;
}
