import {
  IsArray,
  IsString,
  IsInt,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for adding a sticker to a pack
 */
export class AddStickerToPackDto {
  @ApiProperty({
    description: 'ID of the sticker to add to the pack',
    example: '1234567890123456789',
  })
  @IsString()
  stickerId: string;

  @ApiPropertyOptional({
    description: 'Sort order within the pack',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortValue?: number = 0;
}

/**
 * DTO for reordering stickers in a pack
 */
export class ReorderStickerPackItemsDto {
  @ApiProperty({
    description: 'Array of sticker IDs in the desired order',
    example: ['1234567890123456789', '9876543210987654321'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  stickerIds: string[];
}

/**
 * DTO for removing a sticker from a pack
 */
export class RemoveStickerFromPackDto {
  @ApiProperty({
    description: 'ID of the sticker to remove from the pack',
    example: '1234567890123456789',
  })
  @IsString()
  stickerId: string;
}

/**
 * DTO for batch operations on pack items
 */
export class BatchPackItemsDto {
  @ApiProperty({
    description: 'Array of sticker IDs to add to the pack',
    example: ['1234567890123456789', '9876543210987654321'],
  })
  @IsArray()
  @IsString({ each: true })
  addStickerIds?: string[];

  @ApiProperty({
    description: 'Array of sticker IDs to remove from the pack',
    example: ['1111111111111111111'],
  })
  @IsArray()
  @IsString({ each: true })
  removeStickerIds?: string[];

  @ApiPropertyOptional({
    description: 'Reorder all stickers in the pack with new order',
    example: [
      '1234567890123456789',
      '9876543210987654321',
      '1111111111111111111',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reorderStickerIds?: string[];
}
