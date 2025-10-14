import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { ORGANIZATION_CONSTANTS } from 'src/shared/constants';

/**
 * Get Organization DTO
 *
 * Data transfer object for querying organizations with pagination and filtering
 * Extends AdvancedPaginationDto for pagination and filtering capabilities
 */
export class GetOrganizationDto extends AdvancedPaginationDto {
  /**
   * Filter by organization status
   * Can be a single status or comma-separated list
   */
  @IsOptional()
  @IsString()
  @IsEnum(ORGANIZATION_CONSTANTS.STATUS)
  declare status?: string;

  /**
   * Filter by organization visibility
   * Can be a single visibility or comma-separated list
   */
  @IsOptional()
  @IsString()
  @IsEnum(ORGANIZATION_CONSTANTS.VISIBILITY)
  visibility?: string;

  /**
   * Filter by owner user ID
   * Only return organizations owned by this user
   */
  @IsOptional()
  @IsString()
  @IsUUID()
  ownerId?: string;

  /**
   * Filter by member user ID
   * Only return organizations where this user is a member
   */
  @IsOptional()
  @IsString()
  @IsUUID()
  memberId?: string;
}
