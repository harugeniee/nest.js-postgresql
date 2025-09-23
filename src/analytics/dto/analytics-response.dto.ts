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
