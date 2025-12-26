import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for media statistics overview response
 */
export class MediaStatsOverviewDto {
  @ApiProperty({
    description: 'Total number of media files',
    example: 50000,
  })
  totalMedia: number;

  @ApiProperty({
    description: 'Number of active media files',
    example: 45000,
  })
  totalActiveMedia: number;

  @ApiProperty({
    description: 'Media count by type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      image: 30000,
      video: 10000,
      audio: 5000,
      document: 3000,
      other: 2000,
    },
  })
  mediaByType: Record<string, number>;

  @ApiProperty({
    description: 'Media count by status',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      active: 45000,
      inactive: 3000,
      processing: 1000,
      failed: 500,
      deleted: 400,
      archived: 100,
    },
  })
  mediaByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Media count by storage provider',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      r2: 48000,
      local: 2000,
    },
  })
  mediaByStorageProvider: Record<string, number>;

  @ApiProperty({
    description: 'Number of public media files',
    example: 40000,
  })
  publicMedia: number;

  @ApiProperty({
    description: 'Number of private media files',
    example: 10000,
  })
  privateMedia: number;

  @ApiProperty({
    description: 'Total storage size of all media files in bytes',
    example: 1073741824000,
  })
  totalStorageSize: number;

  @ApiProperty({
    description: 'Average file size in bytes',
    example: 21474836,
  })
  averageFileSize: number;

  @ApiProperty({
    description: 'Sum of all view counts',
    example: 5000000,
  })
  totalViews: number;

  @ApiProperty({
    description: 'Sum of all download counts',
    example: 1000000,
  })
  totalDownloads: number;

  @ApiProperty({
    description: 'Number of media uploaded in the last 24 hours',
    example: 500,
  })
  recentUploads: number;

  @ApiProperty({
    description: 'Number of images with scrambling enabled',
    example: 5000,
  })
  scrambledImages: number;

  @ApiProperty({
    description: 'Top 10 MIME types with counts',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        mimeType: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      { mimeType: 'image/jpeg', count: 20000 },
      { mimeType: 'image/png', count: 10000 },
      { mimeType: 'video/mp4', count: 8000 },
    ],
  })
  mediaByMimeType: Array<{
    mimeType: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Top 10 users by media upload count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        username: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      {
        userId: '1234567890123456789',
        username: 'user1',
        count: 5000,
      },
      {
        userId: '9876543210987654321',
        username: 'user2',
        count: 3000,
      },
    ],
  })
  topUploaders: Array<{
    userId: string;
    username: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Top 10 media files by view count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        viewCount: { type: 'number' },
      },
    },
    example: [
      {
        id: '1234567890123456789',
        name: 'popular-image.jpg',
        viewCount: 50000,
      },
      {
        id: '9876543210987654321',
        name: 'viral-video.mp4',
        viewCount: 30000,
      },
    ],
  })
  mostViewedMedia: Array<{
    id: string;
    name: string;
    viewCount: number;
  }>;

  @ApiProperty({
    description: 'Top 10 media files by download count',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        downloadCount: { type: 'number' },
      },
    },
    example: [
      {
        id: '1234567890123456789',
        name: 'document.pdf',
        downloadCount: 10000,
      },
      {
        id: '9876543210987654321',
        name: 'template.docx',
        downloadCount: 5000,
      },
    ],
  })
  mostDownloadedMedia: Array<{
    id: string;
    name: string;
    downloadCount: number;
  }>;
}
