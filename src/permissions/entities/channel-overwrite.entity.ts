import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import { OverwriteTargetType } from '../constants/permissions.constants';

/**
 * ChannelOverwrite entity representing Discord-style permission overwrites
 * Overwrites allow fine-grained permission control for specific channels
 */
@Entity({ name: 'channel_overwrites' })
@Index(['channelId', 'targetId', 'targetType'], { unique: true })
@Index(['channelId'])
@Index(['targetId'])
export class ChannelOverwrite extends BaseEntityCustom {
  /**
   * ID of the channel this overwrite applies to
   */
  @Column({ type: 'varchar', length: 50 })
  channelId: string;

  /**
   * ID of the role or user this overwrite targets
   */
  @Column({ type: 'varchar', length: 50 })
  targetId: string;

  /**
   * Type of target (role or member)
   */
  @Column({ type: 'enum', enum: OverwriteTargetType })
  targetType: OverwriteTargetType;

  /**
   * Permissions to allow (stored as string for BigInt handling)
   */
  @Column({ type: 'bigint', default: '0' })
  allow: string;

  /**
   * Permissions to deny (stored as string for BigInt handling)
   */
  @Column({ type: 'bigint', default: '0' })
  deny: string;

  /**
   * Optional reason for this overwrite
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * Get allow permissions as BigInt for bitwise operations
   */
  getAllowAsBigInt(): bigint {
    return BigInt(this.allow);
  }

  /**
   * Get deny permissions as BigInt for bitwise operations
   */
  getDenyAsBigInt(): bigint {
    return BigInt(this.deny);
  }

  /**
   * Set allow permissions from BigInt value
   */
  setAllowFromBigInt(allow: bigint): void {
    this.allow = allow.toString();
  }

  /**
   * Set deny permissions from BigInt value
   */
  setDenyFromBigInt(deny: bigint): void {
    this.deny = deny.toString();
  }

  /**
   * Check if this overwrite applies to a specific role
   */
  isRoleOverwrite(): boolean {
    return this.targetType === OverwriteTargetType.ROLE;
  }

  /**
   * Check if this overwrite applies to a specific member
   */
  isMemberOverwrite(): boolean {
    return this.targetType === OverwriteTargetType.MEMBER;
  }

  /**
   * Check if this overwrite targets the everyone role
   */
  isEveryoneOverwrite(): boolean {
    return this.isRoleOverwrite() && this.targetId.toLowerCase() === 'everyone';
  }
}
