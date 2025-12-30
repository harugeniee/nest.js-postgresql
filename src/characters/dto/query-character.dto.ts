import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for querying characters with filters and pagination
 */
export class QueryCharacterDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CHARACTER_CONSTANTS.GENDER))
  gender?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(CHARACTER_CONSTANTS.BLOOD_TYPES))
  bloodType?: string;

  /**
   * Filter by series ID
   * Optional - filter characters by series ID
   */
  @IsOptional()
  @IsString()
  seriesId?: string;
}

/**
 * DTO for querying characters with cursor pagination
 */
export class QueryCharacterCursorDto extends CursorPaginationDto {
  /**
   * Filter by series ID
   * Optional - filter characters by series ID
   */
  @IsOptional()
  @IsString()
  seriesId?: string;
}
