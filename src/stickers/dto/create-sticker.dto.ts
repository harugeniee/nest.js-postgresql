import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import {
  STICKER_CONSTANTS,
  StickerFormat,
  StickerStatus,
} from 'src/shared/constants';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new sticker
 */
export class CreateStickerDto {
  @ApiProperty({
    description: 'ID of the uploaded media file',
    example: '1234567890123456789',
  })
  @IsString()
  mediaId: string;

  @ApiProperty({
    description: 'Sticker name for identification',
    example: 'cat_wave',
    maxLength: STICKER_CONSTANTS.NAME_MAX_LENGTH,
  })
  @IsString()
  @Length(1, STICKER_CONSTANTS.NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for categorization',
    example: 'cat,cute,hello',
    maxLength: STICKER_CONSTANTS.TAGS_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.TAGS_MAX_LENGTH)
  tags?: string;

  @ApiPropertyOptional({
    description: 'Short description of the sticker',
    example: 'Waving cat sticker',
    maxLength: STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortValue?: number = 0;
}

/**
 * DTO for updating sticker metadata
 */
export class UpdateStickerDto {
  @ApiPropertyOptional({
    description: 'Sticker name for identification',
    example: 'cat_wave_updated',
    maxLength: STICKER_CONSTANTS.NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(1, STICKER_CONSTANTS.NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for categorization',
    example: 'cat,cute,hello,updated',
    maxLength: STICKER_CONSTANTS.TAGS_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.TAGS_MAX_LENGTH)
  tags?: string;

  @ApiPropertyOptional({
    description: 'Short description of the sticker',
    example: 'Updated waving cat sticker',
    maxLength: STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the sticker is available for use',
    example: true,
  })
  @IsOptional()
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Sticker status for moderation',
    enum: Object.values(STICKER_CONSTANTS.STATUS),
    example: STICKER_CONSTANTS.STATUS.APPROVED,
  })
  @IsOptional()
  @IsEnum(Object.values(STICKER_CONSTANTS.STATUS))
  status?: StickerStatus;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortValue?: number;
}

/**
 * DTO for sticker query parameters
 * Extends AdvancedPaginationDto for consistent pagination and search
 */
export class QueryStickersDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by sticker format',
    enum: Object.values(STICKER_CONSTANTS.FORMATS),
    example: STICKER_CONSTANTS.FORMATS.PNG,
  })
  @IsOptional()
  @IsEnum(Object.values(STICKER_CONSTANTS.FORMATS))
  format?: StickerFormat;

  @ApiPropertyOptional({
    description: 'Filter by sticker status',
    enum: Object.values(STICKER_CONSTANTS.STATUS),
    example: STICKER_CONSTANTS.STATUS.APPROVED,
  })
  @IsOptional()
  @IsEnum(Object.values(STICKER_CONSTANTS.STATUS))
  declare status?: StickerStatus;

  @ApiPropertyOptional({
    description: 'Filter by availability',
    example: true,
  })
  @IsOptional()
  available?: boolean;
}
