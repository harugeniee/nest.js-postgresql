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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TAG_CONSTANTS } from 'src/shared/constants/tag.constants';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'JavaScript',
    minLength: TAG_CONSTANTS.VALIDATION.NAME_MIN_LENGTH,
    maxLength: TAG_CONSTANTS.VALIDATION.NAME_MAX_LENGTH,
  })
  @IsString()
  @MinLength(TAG_CONSTANTS.VALIDATION.NAME_MIN_LENGTH)
  @MaxLength(TAG_CONSTANTS.VALIDATION.NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'javascript',
    maxLength: TAG_CONSTANTS.VALIDATION.SLUG_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(TAG_CONSTANTS.VALIDATION.SLUG_MIN_LENGTH)
  @MaxLength(TAG_CONSTANTS.VALIDATION.SLUG_MAX_LENGTH)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Tag description for context and SEO',
    example:
      'JavaScript is a programming language that enables interactive web pages.',
    maxLength: TAG_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description: 'Tag color in hex format',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  @Matches(TAG_CONSTANTS.VALIDATION.COLOR_PATTERN, {
    message: 'Color must be a valid hex color (e.g., #3B82F6)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Tag icon (emoji, icon name, or URL)',
    example: '🚀',
    maxLength: TAG_CONSTANTS.VALIDATION.ICON_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.ICON_MAX_LENGTH)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Whether this tag is active and visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this tag is featured/promoted',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'SEO meta title for tag pages',
    example: 'JavaScript - Programming Articles and Tutorials',
    maxLength: TAG_CONSTANTS.VALIDATION.META_TITLE_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.META_TITLE_MAX_LENGTH)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description for tag pages',
    example:
      'Discover the latest JavaScript articles, tutorials, and insights. Learn modern web development with JavaScript.',
    maxLength: TAG_CONSTANTS.VALIDATION.META_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(TAG_CONSTANTS.VALIDATION.META_DESCRIPTION_MAX_LENGTH)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    example: {
      category: 'technology',
      language: 'en',
      parentTag: 'programming',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
