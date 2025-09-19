import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BOOKMARK_CONSTANTS, BookmarkableType } from 'src/shared/constants';

/**
 * DTO for creating a new bookmark
 */
export class CreateBookmarkDto {
  @ApiProperty({
    description: 'Type of content being bookmarked',
    enum: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES,
    example: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
  })
  @IsEnum(BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES)
  @IsNotEmpty()
  bookmarkableType: BookmarkableType;

  @ApiProperty({
    description: 'ID of the content being bookmarked',
    example: '1234567890123456789',
  })
  @IsString()
  @IsNotEmpty()
  bookmarkableId: string;

  @ApiPropertyOptional({
    description: 'ID of the folder to add bookmark to',
    example: '1234567890123456789',
  })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Personal note about this bookmark',
    maxLength: BOOKMARK_CONSTANTS.BOOKMARK_NOTE_MAX_LENGTH,
    example: 'Interesting article about AI',
  })
  @IsString()
  @IsOptional()
  @MaxLength(BOOKMARK_CONSTANTS.BOOKMARK_NOTE_MAX_LENGTH)
  note?: string;

  @ApiPropertyOptional({
    description: 'Tags for organizing the bookmark',
    type: [String],
    example: ['ai', 'technology', 'research'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Type(() => String)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether to mark as favorite',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to mark as read later',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isReadLater?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order within the folder',
    default: 0,
  })
  @IsOptional()
  sortOrder?: number;
}
