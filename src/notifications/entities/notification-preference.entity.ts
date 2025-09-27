import { User } from 'src/users/entities/user.entity';
import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * Notification Preference Entity
 *
 * Stores user preferences for different types of notifications
 * Allows users to control which notifications they want to receive
 */
@Entity('notification_preferences')
@Unique(['userId', 'type', 'channel'])
@Index(['userId'])
@Index(['type'])
@Index(['channel'])
export class NotificationPreference extends BaseEntityCustom {
  /**
   * ID of the user who owns this preference
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User who owns this preference
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Type of notification this preference applies to
   * Examples: 'comment', 'like', 'mention', 'article_published'
   */
  @Column({
    type: 'varchar',
    length: NOTIFICATION_CONSTANTS.TYPE_MAX_LENGTH,
    nullable: false,
  })
  type: NotificationType;

  /**
   * Channel this preference applies to
   * Examples: 'email', 'push', 'in_app', 'sms'
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  channel: NotificationChannel;

  /**
   * Whether this notification type is enabled for this channel
   * Default: true
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * Whether to send immediately or batch with other notifications
   * Default: false (immediate)
   */
  @Column({ type: 'boolean', default: false })
  batched: boolean;

  /**
   * Batch frequency in minutes
   * Only used if batched is true
   * Examples: 15, 60, 240, 1440 (daily)
   */
  @Column({ type: 'int', nullable: true })
  batchFrequency?: number;

  /**
   * Quiet hours start time (24-hour format)
   * Notifications will not be sent during quiet hours
   * Examples: '22:00', '23:30'
   */
  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  quietHoursStart?: string;

  /**
   * Quiet hours end time (24-hour format)
   * Notifications will not be sent during quiet hours
   * Examples: '08:00', '09:30'
   */
  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  quietHoursEnd?: string;

  /**
   * Timezone for quiet hours
   * Default: 'UTC'
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'UTC',
  })
  timezone: string;

  /**
   * Additional settings for this preference
   * JSON field for storing channel-specific settings
   */
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  /**
   * Check if notification should be sent based on quiet hours
   * @param date - Date to check (defaults to now)
   * @returns {boolean} True if notification should be sent
   */
  shouldSendInQuietHours(date: Date = new Date()): boolean {
    if (!this.quietHoursStart || !this.quietHoursEnd) {
      return true;
    }

    // Convert to user's timezone
    const userDate = new Date(
      date.toLocaleString('en-US', { timeZone: this.timezone }),
    );
    const currentTime = userDate.toTimeString().slice(0, 5); // HH:MM format

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (this.quietHoursStart > this.quietHoursEnd) {
      return (
        currentTime < this.quietHoursStart && currentTime >= this.quietHoursEnd
      );
    }

    // Handle same-day quiet hours (e.g., 22:00 to 23:00)
    return (
      currentTime < this.quietHoursStart || currentTime >= this.quietHoursEnd
    );
  }

  /**
   * Check if notification is enabled and should be sent
   * @param date - Date to check for quiet hours
   * @returns {boolean} True if notification should be sent
   */
  shouldSend(date: Date = new Date()): boolean {
    return this.enabled && this.shouldSendInQuietHours(date);
  }
}
