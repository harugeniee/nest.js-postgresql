import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBookmarkDto } from './create-bookmark.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { BOOKMARK_CONSTANTS, BookmarkStatus } from 'src/shared/constants';

/**
 * DTO for updating an existing bookmark
 */
export class UpdateBookmarkDto extends PartialType(CreateBookmarkDto) {
  @ApiPropertyOptional({
    description: 'Status of the bookmark',
    enum: BOOKMARK_CONSTANTS.BOOKMARK_STATUS,
    example: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
  })
  @IsEnum(BOOKMARK_CONSTANTS.BOOKMARK_STATUS)
  @IsOptional()
  status?: BookmarkStatus;
}
