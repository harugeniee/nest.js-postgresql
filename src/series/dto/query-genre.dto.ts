import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * DTO for querying genres with filters and pagination
 */
export class QueryGenreDto extends AdvancedPaginationDto {
  /**
   * Filter by genre slug
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  /**
   * Filter by genre name (partial match)
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /**
   * Filter by NSFW flag
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isNsfw?: boolean;

  /**
   * Filter by icon presence
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasIcon?: boolean;

  /**
   * Filter by color presence
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasColor?: boolean;
}
