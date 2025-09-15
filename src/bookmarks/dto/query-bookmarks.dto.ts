import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import {
  BOOKMARK_CONSTANTS,
  BookmarkableType,
  BookmarkStatus,
} from 'src/shared/constants';

/**
 * DTO for querying bookmarks with pagination and filtering
 */
export class QueryBookmarksDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by bookmarkable type',
    enum: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES,
  })
  @IsEnum(BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES)
  @IsOptional()
  declare bookmarkableType?: BookmarkableType;

  @ApiPropertyOptional({
    description: 'Filter by folder ID',
    example: '1234567890123456789',
  })
  @IsString()
  @IsOptional()
  declare folderId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BOOKMARK_CONSTANTS.BOOKMARK_STATUS,
  })
  @IsEnum(BOOKMARK_CONSTANTS.BOOKMARK_STATUS)
  @IsOptional()
  declare status?: BookmarkStatus;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'ai,technology,research',
  })
  @IsString()
  @IsOptional()
  declare tags?: string;

  @ApiPropertyOptional({
    description: 'Filter by favorite status',
  })
  @IsOptional()
  declare isFavorite?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by read later status',
  })
  @IsOptional()
  declare isReadLater?: boolean;

  @ApiPropertyOptional({
    description: 'Search in bookmark notes and tags',
    example: 'machine learning',
  })
  @IsString()
  @IsOptional()
  declare search?: string;
}
