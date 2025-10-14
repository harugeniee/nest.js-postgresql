import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ORGANIZATION_CONSTANTS } from 'src/shared/constants';

/**
 * Create User Organization DTO
 *
 * Data transfer object for adding users to organizations
 */
export class CreateUserOrganizationDto {
  /**
   * User ID to add to the organization
   * Required field
   */
  @IsString()
  @IsUUID()
  userId: string;

  /**
   * Organization ID to add the user to
   * Required field
   */
  @IsString()
  @IsUUID()
  organizationId: string;

  /**
   * Role to assign to the user in the organization
   * Defaults to member if not specified
   */
  @IsOptional()
  @IsEnum(ORGANIZATION_CONSTANTS.MEMBER_ROLE)
  role?: (typeof ORGANIZATION_CONSTANTS.MEMBER_ROLE)[keyof typeof ORGANIZATION_CONSTANTS.MEMBER_ROLE];

  /**
   * Date when the user was invited to the organization
   * Optional field - if not provided, current timestamp will be used
   */
  @IsOptional()
  invitedAt?: Date;
}
