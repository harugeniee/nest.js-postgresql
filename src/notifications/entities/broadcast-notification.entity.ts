import { Entity, Column, Index } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationPriority,
} from 'src/shared/constants';

/**
 * Broadcast Notification Entity
 *
 * Stores system-wide notifications that apply to all users
 * Used for announcements, maintenance notices, etc.
 */
@Entity('broadcast_notifications')
@Index(['isActive'])
@Index(['expiresAt'])
@Index(['type'])
@Index(['priority'])
export class BroadcastNotification extends BaseEntityCustom {
  /**
   * Title of the broadcast notification
   */
  @Column({
    type: 'varchar',
    length: NOTIFICATION_CONSTANTS.TITLE_MAX_LENGTH,
    nullable: false,
  })
  title: string;

  /**
   * Message content of the broadcast notification
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  message: string;

  /**
   * Type of broadcast notification
   */
  @Column({
    type: 'varchar',
    length: NOTIFICATION_CONSTANTS.TYPE_MAX_LENGTH,
    nullable: false,
  })
  type: NotificationType;

  /**
   * Priority of the broadcast notification
   */
  @Column({
    type: 'varchar',
    length: 10,
    default: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
    nullable: false,
  })
  priority: NotificationPriority;

  /**
   * Whether this broadcast is currently active
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * When this broadcast expires (null means never expires)
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  /**
   * Action URL for the broadcast notification
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  actionUrl?: string;

  /**
   * Additional metadata for the broadcast
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Check if broadcast is currently active and not expired
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) return false;
    if (!this.expiresAt) return true;
    return new Date() < this.expiresAt;
  }

  /**
   * Check if broadcast has expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() >= this.expiresAt;
  }
}
