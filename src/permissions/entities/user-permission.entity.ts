import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * UserPermission entity representing specific permissions granted to users
 * This allows for more granular permission control beyond just roles
 */
@Entity({ name: 'user_permissions' })
@Index(['userId', 'permission'], { unique: true })
@Index(['userId'])
export class UserPermission extends BaseEntityCustom {
  /**
   * ID of the user this permission is granted to
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  userId: string;

  /**
   * The user entity this permission belongs to
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Permission name/key (e.g., 'SEND_MESSAGES', 'MANAGE_CHANNELS')
   */
  @Column({ type: 'varchar', length: 100 })
  permission: string;

  /**
   * Permission value (bitmask as string)
   */
  @Column({ type: 'bigint', default: '0' })
  value: string;

  /**
   * Optional context for the permission (e.g., channel ID, organization ID)
   */
  @Column({ type: 'bigint', nullable: true })
  contextId?: string;

  /**
   * Type of context (e.g., 'channel', 'organization')
   */
  @Column({ type: 'varchar', nullable: true })
  contextType?: string;

  /**
   * Optional reason for granting this permission
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * ID of the user who granted this permission
   */
  @Column({ type: 'bigint', nullable: true })
  grantedBy?: string;

  /**
   * When this permission expires (optional)
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  /**
   * Get permission value as BigInt for bitwise operations
   */
  getValueAsBigInt(): bigint {
    return BigInt(this.value);
  }

  /**
   * Set permission value from BigInt
   */
  setValueFromBigInt(value: bigint): void {
    this.value = value.toString();
  }

  /**
   * Check if this permission has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if this permission is still valid
   */
  isValid(): boolean {
    return !this.isDeleted() && !this.isExpired();
  }
}
