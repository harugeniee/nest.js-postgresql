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
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * DTO for creating a new sticker pack
 */
export class CreateStickerPackDto {
  @ApiProperty({
    description: 'Pack name for display',
    example: 'Cute Animals',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug for the pack',
    example: 'cute-animals',
    maxLength: 120,
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Length(1, 120)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Pack description',
    example: 'A collection of cute animal stickers',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
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
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for the pack',
    example: 'cute-animals-updated',
    maxLength: 120,
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Pack description',
    example: 'An updated collection of cute animal stickers',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
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
