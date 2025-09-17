import { ApiProperty } from '@nestjs/swagger';

export class TagStatsDto {
  @ApiProperty({
    description: 'Total number of tags',
    example: 150,
  })
  totalTags: number;

  @ApiProperty({
    description: 'Number of active tags',
    example: 145,
  })
  activeTags: number;

  @ApiProperty({
    description: 'Number of inactive tags',
    example: 5,
  })
  inactiveTags: number;

  @ApiProperty({
    description: 'Number of featured tags',
    example: 20,
  })
  featuredTags: number;

  @ApiProperty({
    description: 'Number of popular tags (usage >= 10)',
    example: 75,
  })
  popularTags: number;

  @ApiProperty({
    description: 'Number of trending tags (usage >= 50)',
    example: 25,
  })
  trendingTags: number;

  @ApiProperty({
    description: 'Total usage count across all tags',
    example: 2500,
  })
  totalUsageCount: number;

  @ApiProperty({
    description: 'Average usage count per tag',
    example: 16.67,
  })
  averageUsageCount: number;

  @ApiProperty({
    description: 'Most used tag name',
    example: 'JavaScript',
  })
  mostUsedTag: string;

  @ApiProperty({
    description: 'Most used tag usage count',
    example: 150,
  })
  mostUsedTagCount: number;

  @ApiProperty({
    description: 'Tags by category',
    example: {
      technology: 80,
      lifestyle: 30,
      business: 25,
      education: 15,
    },
  })
  tagsByCategory: Record<string, number>;

  @ApiProperty({
    description: 'Tags by color',
    example: {
      '#3B82F6': 20,
      '#10B981': 15,
      '#F59E0B': 10,
    },
  })
  tagsByColor: Record<string, number>;

  @ApiProperty({
    description: 'Recent tag creation trend (last 30 days)',
    example: [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
    ],
  })
  recentTrends: Array<{ date: string; count: number }>;
}

export class TagUsageStatsDto {
  @ApiProperty({
    description: 'Tag ID',
    example: '123456789',
  })
  tagId: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'JavaScript',
  })
  tagName: string;

  @ApiProperty({
    description: 'Tag slug',
    example: 'javascript',
  })
  tagSlug: string;

  @ApiProperty({
    description: 'Usage count',
    example: 150,
  })
  usageCount: number;

  @ApiProperty({
    description: 'Usage percentage of total',
    example: 6.0,
  })
  usagePercentage: number;

  @ApiProperty({
    description: 'Growth rate compared to previous period',
    example: 15.5,
  })
  growthRate: number;

  @ApiProperty({
    description: 'Last used date',
    example: '2024-01-15T10:30:00Z',
  })
  lastUsedAt: Date;

  @ApiProperty({
    description: 'Articles using this tag (recent)',
    example: [
      {
        id: '123',
        title: 'Modern JavaScript Features',
        publishedAt: '2024-01-15T10:00:00Z',
      },
    ],
  })
  recentArticles: Array<{
    id: string;
    title: string;
    publishedAt: Date;
  }>;
}
