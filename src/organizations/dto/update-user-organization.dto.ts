import { PartialType } from '@nestjs/swagger';
import { CreateUserOrganizationDto } from './create-user-organization.dto';

/**
 * Update User Organization DTO
 *
 * Data transfer object for updating user-organization relationships
 * Extends CreateUserOrganizationDto with all fields optional
 */
export class UpdateUserOrganizationDto extends PartialType(
  CreateUserOrganizationDto,
) {
  /**
   * User ID to update
   * Optional field for updates
   */
  userId?: string;

  /**
   * Organization ID to update
   * Optional field for updates
   */
  organizationId?: string;

  /**
   * Role to assign to the user in the organization
   * Optional field for updates
   */
  role?: (typeof CreateUserOrganizationDto.prototype.role)[keyof typeof CreateUserOrganizationDto.prototype.role];

  /**
   * Date when the user was invited to the organization
   * Optional field for updates
   */
  invitedAt?: Date;

  /**
   * Whether the user's membership is currently active
   * Optional field for updates
   */
  isActive?: boolean;
}
