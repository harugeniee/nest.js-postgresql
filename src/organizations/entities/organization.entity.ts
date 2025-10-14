import { Media } from 'src/media/entities/media.entity';
import {
  ORGANIZATION_CONSTANTS,
  OrganizationStatus,
  OrganizationVisibility,
} from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

/**
 * Organization entity representing organizations that users can belong to
 *
 * Features:
 * - Organization metadata (name, description, website)
 * - Visibility controls (public/private)
 * - Status management (active/inactive/suspended)
 * - Owner relationship for administrative control
 * - Support for multiple members through UserOrganization entity
 */
@Entity({ name: 'organizations' })
export class Organization extends BaseEntityCustom {
  /**
   * Organization name with maximum length of 100 characters
   * Indexed for search functionality
   */
  @Index()
  @Column({
    type: 'varchar',
    length: ORGANIZATION_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
    comment: 'Organization name, maximum 100 characters',
  })
  name: string;

  /**
   * URL-friendly slug for SEO and routing
   * Must be unique across all organizations
   */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: ORGANIZATION_CONSTANTS.SLUG_MAX_LENGTH,
    nullable: false,
    comment: 'URL-friendly slug, must be unique',
  })
  slug: string;

  /**
   * Optional organization description
   * Can be null if not provided
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Organization description',
  })
  description?: string;

  /**
   * Organization website URL
   * Can be null if no website is provided
   */
  @Column({
    type: 'varchar',
    length: ORGANIZATION_CONSTANTS.WEBSITE_URL_MAX_LENGTH,
    nullable: true,
    comment: 'Organization website URL',
  })
  websiteUrl?: string;

  /**
   * Organization logo image URL
   * Can be null if no logo is set
   */
  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    comment: 'Organization logo image URL',
  })
  logoUrl?: string;

  /**
   * Organization logo image ID
   * Can be null if no logo is set
   */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'Organization logo image ID',
  })
  logoId: string;

  /**
   * Organization logo image
   * Can be null if no logo is set
   */
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'logoId', referencedColumnName: 'id' })
  logo: Media;

  /**
   * Organization visibility level
   * Controls who can view and discover the organization
   * Defaults to public for open organizations
   */
  @Column({
    type: 'enum',
    enum: ORGANIZATION_CONSTANTS.VISIBILITY,
    default: ORGANIZATION_CONSTANTS.VISIBILITY.PUBLIC,
    nullable: false,
    comment: 'Organization visibility: public or private',
  })
  visibility: OrganizationVisibility;

  /**
   * Organization status
   * Manages the organization's operational state
   * Defaults to active for new organizations
   */
  @Column({
    type: 'enum',
    enum: ORGANIZATION_CONSTANTS.STATUS,
    default: ORGANIZATION_CONSTANTS.STATUS.ACTIVE,
    nullable: false,
    comment: 'Organization status: active, inactive, or suspended',
  })
  status: OrganizationStatus;

  /**
   * Foreign key reference to the owner (user) who created this organization
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  ownerId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'ownerId', referencedColumnName: 'id' })
  owner: User;

  /**
   * Total number of members in this organization
   * Used for analytics and display purposes
   * Defaults to 1 (the owner) for new organizations
   */
  @Column({
    type: 'int',
    default: 1,
    nullable: false,
    comment: 'Total number of organization members',
  })
  memberCount: number;

  /**
   * Total number of articles published by this organization
   * Used for analytics and display purposes
   * Defaults to 0 for new organizations
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of articles published by organization',
  })
  articleCount: number;

  /**
   * Roles associated with this organization
   * One-to-many relationship with Role entity for organization-specific roles
   */
  @OneToMany('Role', 'organization')
  roles: any[];
}
