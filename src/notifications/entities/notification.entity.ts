import { User } from 'src/users/entities/user.entity';
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * Notification Entity
 *
 * Stores user notifications for various events
 * Supports multiple channels: email, push, in-app
 */
@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['status'])
@Index(['priority'])
@Index(['channel'])
export class Notification extends BaseEntityCustom {
  /**
   * ID of the user who will receive this notification
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User who will receive this notification
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Type of notification
   * Examples: 'comment', 'like', 'mention', 'article_published', 'system'
   */
  @Column({
    type: 'varchar',
    length: NOTIFICATION_CONSTANTS.TYPE_MAX_LENGTH,
    nullable: false,
  })
  type: NotificationType;

  /**
   * Notification title
   * Maximum length: NOTIFICATION_CONSTANTS.TITLE_MAX_LENGTH
   */
  @Column({
    type: 'varchar',
    length: NOTIFICATION_CONSTANTS.TITLE_MAX_LENGTH,
    nullable: false,
  })
  title: string;

  /**
   * Notification message/content
   * Maximum length: NOTIFICATION_CONSTANTS.MESSAGE_MAX_LENGTH
   */
  @Column({
    type: 'text',
    nullable: false,
  })
  message: string;

  /**
   * Notification status
   * Examples: 'pending', 'sent', 'delivered', 'failed', 'read'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: NOTIFICATION_CONSTANTS.STATUS.PENDING,
    nullable: false,
  })
  status: NotificationStatus;

  /**
   * Notification priority
   * Examples: 'low', 'normal', 'high', 'urgent'
   */
  @Column({
    type: 'varchar',
    length: 10,
    default: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
    nullable: false,
  })
  priority: NotificationPriority;

  /**
   * Notification channel
   * Examples: 'email', 'push', 'in_app', 'sms'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
    nullable: false,
  })
  channel: NotificationChannel;

  /**
   * Related entity type (what triggered this notification)
   * Examples: 'article', 'comment', 'user', 'system'
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  relatedEntityType?: string;

  /**
   * Related entity ID (ID of the entity that triggered this notification)
   */
  @Column({ type: 'bigint', nullable: true })
  relatedEntityId?: string;

  /**
   * Action URL for the notification
   * Where user should be redirected when clicking the notification
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  actionUrl?: string;

  /**
   * Whether the notification has been read by the user
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  /**
   * Timestamp when the notification was read
   * Null if not yet read
   */
  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  /**
   * Timestamp when the notification was sent
   * Null if not yet sent
   */
  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  /**
   * Timestamp when the notification was delivered
   * Null if not yet delivered
   */
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  /**
   * Error message if notification failed to send
   * Null if no error occurred
   */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Retry count for failed notifications
   * Default: 0
   */
  @Column({ type: 'int', default: 0 })
  retryCount: number;

  /**
   * Maximum retry attempts
   * Default: 3
   */
  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  /**
   * Additional metadata for the notification
   * JSON field for storing notification-specific data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Email template name if this is an email notification
   * Examples: 'comment_notification', 'like_notification'
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  emailTemplate?: string;

  /**
   * Email template data
   * Data to be passed to the email template
   */
  @Column({ type: 'jsonb', nullable: true })
  emailTemplateData?: Record<string, any>;

  /**
   * Push notification data
   * Data for push notifications (title, body, icon, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  pushData?: Record<string, any>;

  /**
   * Scheduled send time
   * If set, notification will be sent at this time
   * Null for immediate sending
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledFor?: Date;

  /**
   * Check if notification is pending
   * @returns {boolean} True if notification is pending
   */
  isPending(): boolean {
    return this.status === NOTIFICATION_CONSTANTS.STATUS.PENDING;
  }

  /**
   * Check if notification is sent
   * @returns {boolean} True if notification is sent
   */
  isSent(): boolean {
    return this.status === NOTIFICATION_CONSTANTS.STATUS.SENT;
  }

  /**
   * Check if notification is delivered
   * @returns {boolean} True if notification is delivered
   */
  isDelivered(): boolean {
    return this.status === NOTIFICATION_CONSTANTS.STATUS.DELIVERED;
  }

  /**
   * Check if notification failed
   * @returns {boolean} True if notification failed
   */
  isFailed(): boolean {
    return this.status === NOTIFICATION_CONSTANTS.STATUS.FAILED;
  }

  /**
   * Check if notification can be retried
   * @returns {boolean} True if notification can be retried
   */
  canRetry(): boolean {
    return this.isFailed() && this.retryCount < this.maxRetries;
  }

  /**
   * Mark notification as read
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  /**
   * Mark notification as sent
   */
  markAsSent(): void {
    this.status = NOTIFICATION_CONSTANTS.STATUS.SENT;
    this.sentAt = new Date();
  }

  /**
   * Mark notification as delivered
   */
  markAsDelivered(): void {
    this.status = NOTIFICATION_CONSTANTS.STATUS.DELIVERED;
    this.deliveredAt = new Date();
  }

  /**
   * Mark notification as failed
   * @param errorMessage - Error message
   */
  markAsFailed(errorMessage: string): void {
    this.status = NOTIFICATION_CONSTANTS.STATUS.FAILED;
    this.errorMessage = errorMessage;
    this.retryCount++;
  }
}
