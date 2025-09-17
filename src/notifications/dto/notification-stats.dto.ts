import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for notification statistics response
 */
export class NotificationStatsDto {
  @ApiProperty({
    description: 'Total number of notifications',
    example: 1250,
  })
  total: number;

  @ApiProperty({
    description: 'Number of unread notifications',
    example: 45,
  })
  unread: number;

  @ApiProperty({
    description: 'Number of notifications grouped by type',
    example: {
      article_liked: 500,
      article_commented: 300,
      comment_mentioned: 200,
      system_announcement: 250,
    },
  })
  byType: Record<string, number>;

  @ApiProperty({
    description: 'Number of notifications grouped by status',
    example: {
      pending: 100,
      sent: 800,
      delivered: 300,
      failed: 50,
    },
  })
  byStatus: Record<string, number>;
}
