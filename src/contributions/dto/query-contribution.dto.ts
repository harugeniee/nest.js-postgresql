import { IsIn, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';
import { CONTRIBUTION_CONSTANTS } from 'src/shared/constants/contribution.constants';

/**
 * DTO for querying contributions with filters and pagination
 */
export class QueryContributionDto extends AdvancedPaginationDto {
  /**
   * Filter by entity type
   * Examples: 'series', 'segment', 'character', 'staff'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CONTRIBUTION_CONSTANTS.ENTITY_TYPE))
  entityType?: string;

  /**
   * Filter by action type
   * Examples: 'create', 'update'
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(CONTRIBUTION_CONSTANTS.ACTION))
  action?: string;

  /**
   * Filter by contributor ID
   * Returns only contributions from a specific user
   */
  @IsOptional()
  @IsString()
  contributorId?: string;

  /**
   * Filter by entity ID
   * Returns only contributions for a specific entity
   */
  @IsOptional()
  @IsString()
  entityId?: string;
}
