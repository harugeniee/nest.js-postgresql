import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContentType, KEY_VALUE_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for creating a new key-value pair
 */
export class CreateKeyValueDto {
  @ApiProperty({
    description: 'Unique key identifier',
    maxLength: KEY_VALUE_CONSTANTS.KEY_MAX_LENGTH,
    example: 'user:settings:theme',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(KEY_VALUE_CONSTANTS.KEY_MAX_LENGTH)
  @Transform(({ value }) => value?.trim() ?? undefined)
  key: string;

  @ApiProperty({
    description: 'Value to store (any JSON-serializable data)',
    example: { theme: 'dark', language: 'en' },
  })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({
    description: 'Optional namespace for grouping keys',
    maxLength: KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH,
    example: 'user:preferences',
  })
  @IsString()
  @IsOptional()
  @MaxLength(KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH)
  @Transform(({ value }) => value?.trim() ?? undefined)
  namespace?: string;

  @ApiPropertyOptional({
    description: 'Optional expiration timestamp (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the key-value pair',
    example: { version: '1.0', tags: ['config', 'user'] },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Content type hint for the value',
    enum: KEY_VALUE_CONSTANTS.CONTENT_TYPES,
    example: KEY_VALUE_CONSTANTS.CONTENT_TYPES.OBJECT,
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(KEY_VALUE_CONSTANTS.CONTENT_TYPES))
  contentType?: ContentType;
}
