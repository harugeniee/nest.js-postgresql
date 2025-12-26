import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for comment statistics overview response
 */
export class CommentStatsOverviewDto {
  @ApiProperty({
    description: 'Total number of comments (including replies)',
    example: 50000,
  })
  totalComments: number;

  @ApiProperty({
    description: 'Number of top-level comments (parentId is null)',
    example: 20000,
  })
  totalTopLevelComments: number;

  @ApiProperty({
    description: 'Number of reply comments (parentId is not null)',
    example: 30000,
  })
  totalReplies: number;

  @ApiProperty({
    description: 'Number of pinned comments',
    example: 150,
  })
  pinnedComments: number;

  @ApiProperty({
    description: 'Number of edited comments',
    example: 5000,
  })
  editedComments: number;

  @ApiProperty({
    description: 'Comments count by type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      text: 40000,
      rich: 8000,
      embed: 1500,
      system: 500,
    },
  })
  commentsByType: Record<string, number>;

  @ApiProperty({
    description: 'Comments count by visibility',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      public: 45000,
      private: 3000,
      hidden: 1500,
      deleted: 500,
    },
  })
  commentsByVisibility: Record<string, number>;

  @ApiProperty({
    description: 'Comments count by subject type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      article: 25000,
      post: 15000,
      comment: 8000,
      user: 1000,
      media: 500,
      event: 300,
      product: 200,
    },
  })
  commentsBySubjectType: Record<string, number>;

  @ApiProperty({
    description: 'Number of comments with media attachments',
    example: 5000,
  })
  commentsWithMedia: number;

  @ApiProperty({
    description: 'Total number of media attachments across all comments',
    example: 12000,
  })
  totalMediaAttachments: number;

  @ApiProperty({
    description: 'Number of comments with user mentions',
    example: 3000,
  })
  commentsWithMentions: number;

  @ApiProperty({
    description: 'Total number of mentions across all comments',
    example: 8000,
  })
  totalMentions: number;

  @ApiProperty({
    description: 'Number of comments created in the last 24 hours',
    example: 500,
  })
  recentComments: number;

  @ApiProperty({
    description: 'Average number of replies per top-level comment',
    example: 1.5,
  })
  averageReplyCount: number;

  @ApiProperty({
    description: 'Top 10 subjects by comment count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        subjectType: { type: 'string' },
        subjectId: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      { subjectType: 'article', subjectId: '1234567890123456789', count: 500 },
      { subjectType: 'post', subjectId: '9876543210987654321', count: 300 },
      { subjectType: 'article', subjectId: '1111111111111111111', count: 250 },
    ],
  })
  topCommentedSubjects: Array<{
    subjectType: string;
    subjectId: string;
    count: number;
  }>;
}
