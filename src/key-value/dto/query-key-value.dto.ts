import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { ContentType, KEY_VALUE_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying key-value pairs with advanced filtering and pagination
 */
export class QueryKeyValueDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by namespace',
    maxLength: KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH,
    example: 'user:preferences',
  })
  @IsString()
  @IsOptional()
  @MaxLength(KEY_VALUE_CONSTANTS.NAMESPACE_MAX_LENGTH)
  @Transform(({ value }) => value?.trim() ?? undefined)
  namespace?: string;

  @ApiPropertyOptional({
    description: 'Pattern to match keys (supports SQL LIKE patterns)',
    maxLength: KEY_VALUE_CONSTANTS.MAX_PATTERN_LENGTH,
    example: 'user:settings:%',
  })
  @IsString()
  @IsOptional()
  @MaxLength(KEY_VALUE_CONSTANTS.MAX_PATTERN_LENGTH)
  @Transform(({ value }) => value?.trim() ?? undefined)
  keyPattern?: string;

  @ApiPropertyOptional({
    description: 'Filter by key-value status',
    enum: ['active', 'expired', 'all'],
    example: 'active',
  })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'expired', 'all'])
  kvStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by content type',
    enum: KEY_VALUE_CONSTANTS.CONTENT_TYPES,
    example: KEY_VALUE_CONSTANTS.CONTENT_TYPES.OBJECT,
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(KEY_VALUE_CONSTANTS.CONTENT_TYPES))
  contentType?: ContentType;

  @ApiPropertyOptional({
    description: 'Whether to include expired entries',
    example: 'false',
  })
  @IsBooleanString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return 'true';
    if (value === 'false') return 'false';
    return undefined;
  })
  includeExpired?: string;
}
