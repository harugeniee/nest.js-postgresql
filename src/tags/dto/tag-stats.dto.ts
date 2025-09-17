export class TagStatsDto {
  totalTags: number;
  activeTags: number;
  inactiveTags: number;
  featuredTags: number;
  popularTags: number;
  trendingTags: number;
  totalUsageCount: number;
  averageUsageCount: number;
  mostUsedTag: string;
  mostUsedTagCount: number;
  tagsByCategory: Record<string, number>;
  tagsByColor: Record<string, number>;
  recentTrends: Array<{ date: string; count: number }>;
}

export class TagUsageStatsDto {
  tagId: string;
  tagName: string;
  tagSlug: string;
  usageCount: number;
  usagePercentage: number;
  growthRate: number;
  lastUsedAt: Date;
  recentArticles: Array<{
    id: string;
    title: string;
    publishedAt: Date;
  }>;
}
