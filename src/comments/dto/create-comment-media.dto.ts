import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for regular media attachment in comments
 */
export class CreateCommentMediaDto {
  @ApiProperty({
    description: 'Type of media attachment',
    enum: ['image', 'video', 'audio', 'document', 'other'],
    example: 'image',
  })
  @IsEnum(['image', 'video', 'audio', 'document', 'other'])
  kind: 'image' | 'video' | 'audio' | 'document' | 'other';

  @ApiProperty({
    description: 'ID of the media file',
    example: '1234567890123456789',
  })
  @IsString()
  mediaId: string;

  @ApiPropertyOptional({
    description: 'Sort order for display within the comment',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortValue?: number = 0;
}

/**
 * DTO for sticker attachment in comments
 */
export class CreateCommentStickerDto {
  @ApiProperty({
    description: 'Type of media attachment (must be sticker)',
    enum: ['sticker'],
    example: 'sticker',
  })
  @IsEnum(['sticker'])
  kind: 'sticker';

  @ApiProperty({
    description: 'ID of the sticker',
    example: '1234567890123456789',
  })
  @IsString()
  stickerId: string;

  @ApiPropertyOptional({
    description: 'Sort order for display within the comment',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortValue?: number = 0;
}

/**
 * Union type for all comment media DTOs
 */
export type CreateCommentMediaItemDto =
  | CreateCommentMediaDto
  | CreateCommentStickerDto;
