import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';

/**
 * Update Organization DTO
 *
 * Data transfer object for updating existing organizations
 * Extends CreateOrganizationDto with all fields optional
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  /**
   * Organization name
   * Optional field for updates
   */
  name?: string;

  /**
   * URL-friendly slug for the organization
   * Optional field for updates
   */
  slug?: string;

  /**
   * Organization description
   * Optional field for updates
   */
  description?: string;

  /**
   * Organization website URL
   * Optional field for updates
   */
  websiteUrl?: string;

  /**
   * Organization logo image URL
   * Optional field for updates
   */
  logoUrl?: string;

  /**
   * Organization visibility level
   * Optional field for updates
   */
  visibility?: (typeof CreateOrganizationDto.prototype.visibility)[keyof typeof CreateOrganizationDto.prototype.visibility];

  /**
   * Owner user ID
   * Optional field for updates (can only be changed by current owner or admin)
   */
  ownerId?: string;
}
