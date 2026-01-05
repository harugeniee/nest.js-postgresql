import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * DTO for querying series that a staff member has worked on
 * Supports filtering by role and main status
 */
export class QueryStaffSeriesDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  role?: string; // Filter by staff role (e.g., 'director', 'producer', 'composer')

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMain?: boolean; // Filter by main/primary roles only
}
