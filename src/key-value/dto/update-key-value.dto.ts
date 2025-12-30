import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ContentType, KEY_VALUE_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for updating an existing key-value pair
 */
export class UpdateKeyValueDto {
  @ApiPropertyOptional({
    description: 'New value to store (any JSON-serializable data)',
    example: { theme: 'light', language: 'vi' },
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'New expiration timestamp (ISO 8601)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata for the key-value pair',
    example: { version: '1.1', tags: ['config', 'user', 'updated'] },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated content type hint',
    enum: KEY_VALUE_CONSTANTS.CONTENT_TYPES,
    example: KEY_VALUE_CONSTANTS.CONTENT_TYPES.OBJECT,
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(KEY_VALUE_CONSTANTS.CONTENT_TYPES))
  contentType?: ContentType;
}
