import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

/**
 * Analytics Event Entity
 *
 * Stores user events and interactions for analytics tracking
 * Extends BaseEntityCustom for common fields (id, uuid, timestamps, etc.)
 */
@Entity('analytics_events')
@Index(['userId'])
@Index(['eventType'])
@Index(['subjectType', 'subjectId'])
export class AnalyticsEvent extends BaseEntityCustom {
  /**
   * ID of the user who triggered the event
   * Can be null for anonymous events
   */
  @Column({ type: 'bigint', nullable: true })
  userId: string;

  /**
   * Type of event that occurred
   * Examples: 'article_view', 'user_follow', 'reaction_set'
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  eventType: string;

  /**
   * Category of the event for grouping
   * Examples: 'user', 'content', 'engagement', 'system'
   */
  @Column({ type: 'varchar', length: 50, nullable: false })
  eventCategory: string;

  /**
   * Type of subject the event relates to
   * Examples: 'article', 'comment', 'user', 'reaction'
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  subjectType: string;

  /**
   * ID of the subject the event relates to
   * Examples: article ID, comment ID, user ID
   */
  @Column({ type: 'bigint', nullable: true })
  subjectId: string;

  /**
   * Additional event data stored as JSON
   * Can include custom properties, metadata, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  eventData: Record<string, any>;

  /**
   * Session ID for tracking user sessions
   * Used for session-based analytics
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId: string;

  /**
   * IP address of the user
   * Used for geographic analytics and security
   */
  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  /**
   * User agent string from the request
   * Used for device and browser analytics
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;
}
