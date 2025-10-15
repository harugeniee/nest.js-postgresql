// Swagger removed
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BADGE_CONSTANTS,
  BadgeCategory,
  BadgeRarity,
  BadgeStatus,
  BadgeType,
} from 'src/shared/constants';

/**
 * DTO for creating a new badge
 */
export class CreateBadgeDto {
  @IsEnum(BadgeType)
  @IsNotEmpty()
  type!: BadgeType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(BADGE_CONSTANTS.NAME_MAX_LENGTH)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(BADGE_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsEnum(BadgeCategory)
  @IsNotEmpty()
  category!: BadgeCategory;

  @IsEnum(BadgeRarity)
  @IsNotEmpty()
  rarity!: BadgeRarity;

  @IsOptional()
  @IsEnum(BadgeStatus)
  status?: BadgeStatus;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isObtainable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(BADGE_CONSTANTS.DISPLAY_ORDER_MIN)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(BADGE_CONSTANTS.ICON_URL_MAX_LENGTH)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isAutoAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  isManuallyAssignable?: boolean;

  @IsOptional()
  @IsBoolean()
  isRevokable?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
