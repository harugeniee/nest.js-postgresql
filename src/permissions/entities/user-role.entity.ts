import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Role } from './role.entity';

/**
 * UserRole entity representing the assignment of roles to users
 * This is a junction table for the many-to-many relationship between users and roles
 */
@Entity({ name: 'user_roles' })
@Index(['userId', 'roleId'], { unique: true })
@Index(['userId'])
@Index(['roleId'])
export class UserRole extends BaseEntityCustom {
  /**
   * ID of the user this role assignment belongs to
   */
  @Column({ type: 'varchar', length: 50 })
  userId: string;

  /**
   * ID of the role assigned to the user
   */
  @Column({ type: 'varchar', length: 50 })
  roleId: string;

  /**
   * The role entity this assignment references
   */
  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  role: Role;

  /**
   * Optional reason for role assignment
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * ID of the user who assigned this role (for audit purposes)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  assignedBy?: string;

  /**
   * When this role assignment expires (optional)
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  /**
   * Whether this role assignment is temporary
   */
  @Column({ type: 'boolean', default: false })
  isTemporary: boolean;

  /**
   * Check if this role assignment has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if this role assignment is still valid (not expired and not deleted)
   */
  isValid(): boolean {
    return !this.isDeleted() && !this.isExpired();
  }
}
