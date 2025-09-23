/**
 * Dashboard Response DTOs
 *
 * Response data transfer objects for dashboard analytics endpoints
 */

export class DashboardWidgetResponseDto {
  widgetType: string;
  title: string;
  data: any;
  metadata: {
    lastUpdated: Date;
    dataPoints: number;
    granularity: string;
    comparison?: {
      period: string;
      change: number;
      changeType: 'increase' | 'decrease' | 'no_change';
    };
  };
}

export class RealTimeAnalyticsQueryDto {
  eventTypes?: string[];
  eventCategories?: string[];
  subjectTypes?: string[];
  userIds?: string[];
  includeAnonymous?: boolean;
  refreshInterval?: number; // milliseconds
  timeWindow?: number; // minutes
  includeLiveEvents?: boolean;
}

export class RealTimeAnalyticsResponseDto {
  timestamp: Date;
  activeUsers: number;
  eventsInWindow: number;
  topEvents: Array<{
    eventType: string;
    count: number;
    percentage: number;
  }>;
  liveEvents?: Array<{
    id: string;
    eventType: string;
    userId?: string;
    timestamp: Date;
    eventData?: any;
  }>;
  metadata: {
    timeWindow: number;
    refreshInterval: number;
    nextUpdate: Date;
  };
}

export class AnalyticsExportQueryDto {
  format: 'csv' | 'json' | 'pdf';
  fromDate?: Date;
  toDate?: Date;
  eventTypes?: string[];
  eventCategories?: string[];
  subjectTypes?: string[];
  userIds?: string[];
  includeAnonymous?: boolean;
  includeMetadata?: boolean;
  includeRawData?: boolean;
  includeAggregatedData?: boolean;
  includeChartsData?: boolean;
  page?: number;
  limit?: number;
}

export class AnalyticsExportResponseDto {
  downloadUrl: string;
  filename: string;
  format: string;
  size: number;
  expiresAt: Date;
  metadata: {
    totalRecords: number;
    dateRange: {
      from: Date;
      to: Date;
    };
    generatedAt: Date;
  };
}

export class UserActivityDashboardDto {
  totalActiveUsers: number;
  newUsers: number;
  returningUsers: number;
  userEngagement: {
    averageSessionDuration: number;
    sessionsPerUser: number;
    bounceRate: number;
  };
  topUserActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  timeSeries: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    sessions: number;
  }>;
}

export class ContentPerformanceDashboardDto {
  totalContent: number;
  topPerformingContent: Array<{
    id: string;
    title: string;
    type: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }>;
  contentMetrics: {
    averageViews: number;
    averageEngagement: number;
    topContentType: string;
  };
  trendingContent: Array<{
    id: string;
    title: string;
    type: string;
    growthRate: number;
    currentViews: number;
  }>;
  timeSeries: Array<{
    date: string;
    totalViews: number;
    totalEngagement: number;
    newContent: number;
  }>;
}

export class EngagementMetricsDashboardDto {
  overallEngagement: {
    totalInteractions: number;
    engagementRate: number;
    averageEngagementPerUser: number;
  };
  engagementBreakdown: {
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    reactions: number;
  };
  topEngagementSources: Array<{
    source: string;
    interactions: number;
    percentage: number;
  }>;
  engagementTrends: Array<{
    date: string;
    totalEngagement: number;
    engagementRate: number;
  }>;
  userEngagementSegments: Array<{
    segment: string;
    userCount: number;
    averageEngagement: number;
  }>;
}

export class TrafficSourcesDashboardDto {
  totalTraffic: number;
  trafficSources: Array<{
    source: string;
    visits: number;
    percentage: number;
    conversionRate: number;
  }>;
  referrers: Array<{
    domain: string;
    visits: number;
    percentage: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    visits: number;
    percentage: number;
  }>;
  browserBreakdown: Array<{
    browser: string;
    visits: number;
    percentage: number;
  }>;
  timeSeries: Array<{
    date: string;
    totalTraffic: number;
    organicTraffic: number;
    directTraffic: number;
    referralTraffic: number;
  }>;
}

export class GeographicDataDashboardDto {
  totalCountries: number;
  topCountries: Array<{
    country: string;
    users: number;
    percentage: number;
    sessions: number;
  }>;
  topCities: Array<{
    city: string;
    country: string;
    users: number;
    percentage: number;
  }>;
  geographicDistribution: Array<{
    region: string;
    users: number;
    percentage: number;
  }>;
  timeSeries: Array<{
    date: string;
    totalUsers: number;
    topCountry: string;
    topCountryUsers: number;
  }>;
}

export class ConversionFunnelDashboardDto {
  funnelSteps: Array<{
    step: string;
    users: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
  overallConversion: number;
  topConversionPaths: Array<{
    path: string;
    users: number;
    conversionRate: number;
  }>;
  conversionTrends: Array<{
    date: string;
    totalConversions: number;
    conversionRate: number;
  }>;
  bottlenecks: Array<{
    step: string;
    dropOffRate: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export class RetentionAnalysisDashboardDto {
  cohortAnalysis: Array<{
    cohort: string;
    day0: number;
    day1: number;
    day7: number;
    day14: number;
    day30: number;
  }>;
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
  retentionTrends: Array<{
    date: string;
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
  }>;
  churnAnalysis: {
    churnRate: number;
    churnedUsers: number;
    churnTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export class RevenueMetricsDashboardDto {
  totalRevenue: number;
  revenueBreakdown: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  revenueTrends: Array<{
    date: string;
    revenue: number;
    transactions: number;
    averageOrderValue: number;
  }>;
  topRevenueGenerators: Array<{
    id: string;
    name: string;
    revenue: number;
    transactions: number;
  }>;
  conversionMetrics: {
    revenuePerUser: number;
    revenuePerSession: number;
    conversionRate: number;
  };
}
