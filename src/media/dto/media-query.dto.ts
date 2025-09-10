import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MediaType, MediaStatus, MEDIA_CONSTANTS } from 'src/shared/constants';

export class MediaQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for name, title, or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by media type',
    enum: Object.values(MEDIA_CONSTANTS.TYPES),
  })
  @IsOptional()
  @IsEnum(MEDIA_CONSTANTS.TYPES)
  type?: MediaType;

  @ApiPropertyOptional({
    description: 'Filter by media status',
    enum: Object.values(MEDIA_CONSTANTS.STATUS),
  })
  @IsOptional()
  @IsEnum(MEDIA_CONSTANTS.STATUS)
  status?: MediaStatus;

  @ApiPropertyOptional({
    description: 'Filter by public status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Filter by date range - start date (ISO string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range - end date (ISO string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum file size in bytes' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  minSize?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum file size in bytes' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  maxSize?: number;
}
