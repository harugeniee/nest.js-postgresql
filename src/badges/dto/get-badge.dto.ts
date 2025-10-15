// Swagger removed
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import {
  BadgeCategory,
  BadgeRarity,
  BadgeStatus,
  BadgeType,
} from 'src/shared/constants';

/**
 * DTO for querying badges with filters and pagination
 */
export class GetBadgeDto extends AdvancedPaginationDto {
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
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isObtainable?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isAutoAssigned?: boolean;

  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isManuallyAssignable?: boolean;
}
