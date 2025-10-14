import { UserPermission } from 'src/permissions/entities/user-permission.entity';
import {
  ORGANIZATION_CONSTANTS,
  OrganizationMemberRole,
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
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * UserOrganization entity representing the many-to-many relationship between users and organizations
 *
 * Features:
 * - User membership in organizations with specific roles
 * - Unique constraint to prevent duplicate memberships
 * - Role-based permissions (owner, admin, member)
 * - Joined date tracking for membership management
 */
@Entity({ name: 'user_organizations' })
@Unique(['userId', 'organizationId']) // Prevent duplicate memberships
export class UserOrganization extends BaseEntityCustom {
  /**
   * Foreign key reference to the user who is a member of the organization
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Foreign key reference to the organization the user belongs to
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to organizations.id',
  })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organizationId', referencedColumnName: 'id' })
  organization: Organization;

  /**
   * Role of the user within the organization
   * Defines permissions and capabilities
   * Defaults to member for regular users
   */
  @Column({
    type: 'enum',
    enum: ORGANIZATION_CONSTANTS.MEMBER_ROLE,
    default: ORGANIZATION_CONSTANTS.MEMBER_ROLE.MEMBER,
    nullable: false,
    comment: 'User role within the organization: owner, admin, or member',
  })
  role: OrganizationMemberRole;

  /**
   * Date when the user joined the organization
   * Used for membership tracking and analytics
   * Defaults to current timestamp
   */
  @Index()
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
    comment: 'Date when user joined the organization',
  })
  joinedAt: Date;

  /**
   * Date when the user was invited to the organization
   * Can be different from joinedAt if invitation was sent earlier
   * Can be null if user joined without invitation
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date when user was invited to the organization',
  })
  invitedAt?: Date;

  /**
   * Whether the user's membership is currently active
   * Used for soft deletion of memberships without removing records
   * Defaults to true for active memberships
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether the membership is currently active',
  })
  isActive: boolean;

  /**
   * Specific permissions granted to this user in this organization
   * One-to-many relationship with UserPermission
   */
  @OneToMany(() => UserPermission, (userPermission) => userPermission.user, {
    cascade: false, // Don't cascade delete permissions when membership is deleted
    eager: false, // Don't load permissions by default for performance
  })
  permissions?: UserPermission[];
}
