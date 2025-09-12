import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { STICKER_CONSTANTS } from 'src/shared/constants';
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * DTO for creating a new sticker pack
 */
export class CreateStickerPackDto {
  @ApiProperty({
    description: 'Pack name for display',
    example: 'Cute Animals',
    maxLength: STICKER_CONSTANTS.PACK_NAME_MAX_LENGTH,
  })
  @IsString()
  @Length(1, STICKER_CONSTANTS.PACK_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug for the pack',
    example: 'cute-animals',
    maxLength: STICKER_CONSTANTS.PACK_SLUG_MAX_LENGTH,
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Length(1, STICKER_CONSTANTS.PACK_SLUG_MAX_LENGTH)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Pack description',
    example: 'A collection of cute animal stickers',
    maxLength: STICKER_CONSTANTS.PACK_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.PACK_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the pack is published and visible to users',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;

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
 * DTO for updating sticker pack
 */
export class UpdateStickerPackDto {
  @ApiPropertyOptional({
    description: 'Pack name for display',
    example: 'Cute Animals Updated',
    maxLength: STICKER_CONSTANTS.PACK_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(1, STICKER_CONSTANTS.PACK_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for the pack',
    example: 'cute-animals-updated',
    maxLength: STICKER_CONSTANTS.PACK_SLUG_MAX_LENGTH,
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @Length(1, STICKER_CONSTANTS.PACK_SLUG_MAX_LENGTH)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Pack description',
    example: 'An updated collection of cute animal stickers',
    maxLength: STICKER_CONSTANTS.PACK_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(0, STICKER_CONSTANTS.PACK_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the pack is published and visible to users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

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
 * DTO for sticker pack query parameters
 * Extends AdvancedPaginationDto for consistent pagination and search
 */
export class QueryStickerPacksDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by published status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
