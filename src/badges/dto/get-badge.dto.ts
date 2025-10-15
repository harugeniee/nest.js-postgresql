// Swagger removed
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import {
    BadgeCategory,
    BadgeRarity,
    BadgeStatus,
    BadgeType,
} from 'src/shared/constants';

/**
 * DTO for querying badges with filters and pagination
 */
export class GetBadgeDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(BadgeType, { each: true })
  types?: BadgeType[];

  @IsOptional()
  @IsArray()
  @IsEnum(BadgeCategory, { each: true })
  categories?: BadgeCategory[];

  @IsOptional()
  @IsArray()
  @IsEnum(BadgeRarity, { each: true })
  rarities?: BadgeRarity[];

  @IsOptional()
  @IsArray()
  @IsEnum(BadgeStatus, { each: true })
  statuses?: BadgeStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isObtainable?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isAutoAssigned?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isManuallyAssignable?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'displayOrder';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'ASC';
}
