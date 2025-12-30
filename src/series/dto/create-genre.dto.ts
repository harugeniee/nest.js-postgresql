import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new genre
 */
export class CreateGenreDto {
  /**
   * URL-friendly unique identifier for the genre
   * Must be unique across all genres
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  /**
   * Display name of the genre
   * Human-readable genre name
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /**
   * Detailed description of the genre
   * Optional description explaining what the genre represents
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Icon identifier or URL for the genre
   * Used for displaying genre icons in the UI
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  /**
   * Color code for the genre (hex, RGB, or color name)
   * Used for visual distinction and theming in the application
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  /**
   * Sort order for displaying genres in lists
   * Lower values appear first
   */
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  /**
   * NSFW content flag
   * Indicates if the genre is associated with adult/18+ content
   */
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  /**
   * Additional metadata for the genre
   * JSON field for storing structured data
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
