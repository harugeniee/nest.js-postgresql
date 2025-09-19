import {
  IsString,
  IsOptional,
  IsBoolean,
  IsHexColor,
  IsObject,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { TAG_CONSTANTS } from 'src/shared/constants/tag.constants';

export class CreateTagDto {
  @IsString()
  @MinLength(TAG_CONSTANTS.VALIDATION.NAME_MIN_LENGTH)
  @MaxLength(TAG_CONSTANTS.VALIDATION.NAME_MAX_LENGTH)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(TAG_CONSTANTS.VALIDATION.SLUG_MIN_LENGTH)
  @MaxLength(TAG_CONSTANTS.VALIDATION.SLUG_MAX_LENGTH)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  @Matches(TAG_CONSTANTS.VALIDATION.COLOR_PATTERN, {
    message: 'Color must be a valid hex color (e.g., #3B82F6)',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.ICON_MAX_LENGTH)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.META_TITLE_MAX_LENGTH)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.META_DESCRIPTION_MAX_LENGTH)
  metaDescription?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
