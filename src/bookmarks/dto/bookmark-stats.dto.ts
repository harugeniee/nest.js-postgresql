import { ApiProperty } from '@nestjs/swagger';
import { BookmarkableType } from 'src/shared/constants';

/**
 * DTO for bookmark statistics response
 */
export class BookmarkStatsDto {
  @ApiProperty({
    description: 'Total number of bookmarks',
    example: 150,
  })
  totalBookmarks: number;

  @ApiProperty({
    description: 'Number of active bookmarks',
    example: 145,
  })
  activeBookmarks: number;

  @ApiProperty({
    description: 'Number of archived bookmarks',
    example: 5,
  })
  archivedBookmarks: number;

  @ApiProperty({
    description: 'Number of favorite bookmarks',
    example: 25,
  })
  favoriteBookmarks: number;

  @ApiProperty({
    description: 'Number of read later bookmarks',
    example: 30,
  })
  readLaterBookmarks: number;

  @ApiProperty({
    description: 'Total number of folders',
    example: 8,
  })
  totalFolders: number;

  @ApiProperty({
    description: 'Bookmarks count by type',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      article: 100,
      comment: 30,
      media: 15,
      user: 5,
    },
  })
  bookmarksByType: Record<BookmarkableType, number>;

  @ApiProperty({
    description: 'Most used tags',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tag: { type: 'string' },
        count: { type: 'number' },
      },
    },
    example: [
      { tag: 'ai', count: 25 },
      { tag: 'technology', count: 20 },
      { tag: 'research', count: 15 },
    ],
  })
  topTags: Array<{ tag: string; count: number }>;

  @ApiProperty({
    description: 'Folders with bookmark counts',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        folderId: { type: 'string' },
        folderName: { type: 'string' },
        bookmarkCount: { type: 'number' },
      },
    },
    example: [
      { folderId: '123', folderName: 'Favorites', bookmarkCount: 25 },
      { folderId: '456', folderName: 'Read Later', bookmarkCount: 30 },
    ],
  })
  foldersWithCounts: Array<{
    folderId: string;
    folderName: string;
    bookmarkCount: number;
  }>;
}
