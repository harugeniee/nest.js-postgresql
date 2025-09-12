import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Length,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StickerFormat } from 'src/shared/constants';
import { AdvancedPaginationDto } from 'src/common/dto';

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
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for categorization',
    example: 'cat,cute,hello',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  tags?: string;

  @ApiPropertyOptional({
    description: 'Short description of the sticker',
    example: 'Waving cat sticker',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
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
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for categorization',
    example: 'cat,cute,hello,updated',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  tags?: string;

  @ApiPropertyOptional({
    description: 'Short description of the sticker',
    example: 'Updated waving cat sticker',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the sticker is available for use',
    example: true,
  })
  @IsOptional()
  available?: boolean;

  @ApiPropertyOptional({
    description: 'Sticker status for moderation',
    enum: ['draft', 'approved', 'rejected'],
    example: 'approved',
  })
  @IsOptional()
  @IsEnum(['draft', 'approved', 'rejected'])
  status?: 'draft' | 'approved' | 'rejected';

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
    enum: ['png', 'apng', 'gif', 'lottie'],
    example: 'png',
  })
  @IsOptional()
  @IsEnum(['png', 'apng', 'gif', 'lottie'])
  format?: StickerFormat;

  @ApiPropertyOptional({
    description: 'Filter by sticker status',
    enum: ['draft', 'approved', 'rejected'],
    example: 'approved',
  })
  @IsOptional()
  @IsEnum(['draft', 'approved', 'rejected'])
  declare status?: 'draft' | 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Filter by availability',
    example: true,
  })
  @IsOptional()
  available?: boolean;
}
