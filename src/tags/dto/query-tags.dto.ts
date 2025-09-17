import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import {
  TAG_CONSTANTS,
  TagSortOption,
} from 'src/shared/constants/tag.constants';

export class QueryTagsDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Search query for tag name or description',
    example: 'javascript',
    minLength: TAG_CONSTANTS.SEARCH.MIN_QUERY_LENGTH,
    maxLength: TAG_CONSTANTS.SEARCH.MAX_QUERY_LENGTH,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by featured tags',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'technology',
    enum: Object.values(TAG_CONSTANTS.CATEGORIES),
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by color',
    example: '#3B82F6',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Minimum usage count',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minUsageCount?: number;

  @ApiPropertyOptional({
    description: 'Maximum usage count',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxUsageCount?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'usage',
    enum: TAG_CONSTANTS.SEARCH.SORT_OPTIONS,
  })
  @IsOptional()
  @IsEnum(TAG_CONSTANTS.SEARCH.SORT_OPTIONS)
  sortBy?: TagSortOption;

  @ApiPropertyOptional({
    description: 'Include inactive tags in results',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({
    description: 'Include tags with zero usage count',
    example: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeUnused?: boolean;
}
