import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import {
  BOOKMARK_CONSTANTS,
  FolderType,
  FolderVisibility,
} from 'src/shared/constants';

/**
 * DTO for querying bookmark folders with pagination and filtering
 */
export class QueryBookmarkFoldersDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by folder type',
    enum: BOOKMARK_CONSTANTS.FOLDER_TYPES,
  })
  @IsEnum(BOOKMARK_CONSTANTS.FOLDER_TYPES)
  @IsOptional()
  declare type?: FolderType;

  @ApiPropertyOptional({
    description: 'Filter by visibility',
    enum: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY,
  })
  @IsEnum(BOOKMARK_CONSTANTS.FOLDER_VISIBILITY)
  @IsOptional()
  declare visibility?: FolderVisibility;

  @ApiPropertyOptional({
    description: 'Filter by default folders only',
  })
  @IsOptional()
  declare isDefault?: boolean;
}
