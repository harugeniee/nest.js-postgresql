import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BOOKMARK_CONSTANTS,
  FolderType,
  FolderVisibility,
} from 'src/shared/constants';

/**
 * DTO for creating a new bookmark folder
 */
export class CreateBookmarkFolderDto {
  @ApiProperty({
    description: 'Name of the folder',
    maxLength: BOOKMARK_CONSTANTS.FOLDER_NAME_MAX_LENGTH,
    example: 'My Favorites',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(BOOKMARK_CONSTANTS.FOLDER_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the folder',
    maxLength: BOOKMARK_CONSTANTS.FOLDER_DESCRIPTION_MAX_LENGTH,
    example: 'Collection of my favorite articles',
  })
  @IsString()
  @IsOptional()
  @MaxLength(BOOKMARK_CONSTANTS.FOLDER_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of folder',
    enum: BOOKMARK_CONSTANTS.FOLDER_TYPES,
    default: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
  })
  @IsEnum(BOOKMARK_CONSTANTS.FOLDER_TYPES)
  @IsOptional()
  type?: FolderType;

  @ApiPropertyOptional({
    description: 'Visibility of the folder',
    enum: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY,
    default: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
  })
  @IsEnum(BOOKMARK_CONSTANTS.FOLDER_VISIBILITY)
  @IsOptional()
  visibility?: FolderVisibility;

  @ApiPropertyOptional({
    description: 'Sort order for folder display',
    default: 0,
  })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Color theme for the folder (hex color)',
    example: '#FF5733',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Icon for the folder',
    example: 'star',
  })
  @IsString()
  @IsOptional()
  icon?: string;
}
