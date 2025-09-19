import { User } from 'src/users/entities/user.entity';
import { Report } from './report.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  REPORT_CONSTANTS,
  ReportAction as ReportActionType,
} from 'src/shared/constants';

/**
 * Report Action Entity
 *
 * Tracks all actions taken on reports by moderators
 * Provides audit trail for moderation decisions
 */
@Entity('report_actions')
@Index(['reportId'])
@Index(['moderatorId'])
@Index(['action'])
export class ReportAction extends BaseEntityCustom {
  /**
   * ID of the report this action belongs to
   * Links to reports table
   */
  @Column({ type: 'bigint', nullable: false })
  reportId: string;

  /**
   * Report this action belongs to
   * Many-to-One relationship with Report entity
   */
  @ManyToOne(() => Report, (report) => report.actions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportId', referencedColumnName: 'id' })
  report: Report;

  /**
   * ID of the moderator who performed this action
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  moderatorId: string;

  /**
   * Moderator who performed this action
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'moderatorId', referencedColumnName: 'id' })
  moderator: User;

  /**
   * Type of action performed
   * Examples: 'content_removed', 'user_warned', 'report_dismissed'
   */
  @Column({
    type: 'varchar',
    length: REPORT_CONSTANTS.ACTION_MAX_LENGTH,
    nullable: false,
  })
  action: ReportActionType;

  /**
   * Description of the action taken
   * Optional detailed explanation of what was done
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * Additional notes about the action
   * Internal notes for moderation team
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  /**
   * Additional metadata for the action
   * JSON field for storing action-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  /**
   * Check if this is a content removal action
   * @returns {boolean} True if action involves content removal
   */
  isContentRemoval(): boolean {
    return [
      REPORT_CONSTANTS.ACTIONS.CONTENT_REMOVED,
      REPORT_CONSTANTS.ACTIONS.CONTENT_HIDDEN,
      REPORT_CONSTANTS.ACTIONS.CONTENT_EDITED,
    ].includes(this.action as any);
  }

  /**
   * Check if this is a user action
   * @returns {boolean} True if action involves user moderation
   */
  isUserAction(): boolean {
    return [
      REPORT_CONSTANTS.ACTIONS.USER_WARNED,
      REPORT_CONSTANTS.ACTIONS.USER_SUSPENDED,
      REPORT_CONSTANTS.ACTIONS.USER_BANNED,
      REPORT_CONSTANTS.ACTIONS.ACCOUNT_DELETED,
    ].includes(this.action as any);
  }

  /**
   * Check if this is an escalation action
   * @returns {boolean} True if action involves escalation
   */
  isEscalation(): boolean {
    return [
      REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_ADMIN,
      REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_LEGAL,
    ].includes(this.action as any);
  }

  /**
   * Check if this is a dismissal action
   * @returns {boolean} True if action dismisses the report
   */
  isDismissal(): boolean {
    return [
      REPORT_CONSTANTS.ACTIONS.REPORT_DISMISSED,
      REPORT_CONSTANTS.ACTIONS.NO_ACTION,
    ].includes(this.action as any);
  }

  /**
   * Get a human-readable description of the action
   * @returns {string} Human-readable action description
   */
  getActionDescription(): string {
    const actionDescriptions: Record<ReportActionType, string> = {
      [REPORT_CONSTANTS.ACTIONS.NO_ACTION]: 'No action taken',
      [REPORT_CONSTANTS.ACTIONS.WARNING]: 'Warning issued',
      [REPORT_CONSTANTS.ACTIONS.CONTENT_REMOVED]: 'Content removed',
      [REPORT_CONSTANTS.ACTIONS.CONTENT_HIDDEN]: 'Content hidden',
      [REPORT_CONSTANTS.ACTIONS.CONTENT_EDITED]: 'Content edited',
      [REPORT_CONSTANTS.ACTIONS.USER_WARNED]: 'User warned',
      [REPORT_CONSTANTS.ACTIONS.USER_SUSPENDED]: 'User suspended',
      [REPORT_CONSTANTS.ACTIONS.USER_BANNED]: 'User banned',
      [REPORT_CONSTANTS.ACTIONS.ACCOUNT_DELETED]: 'Account deleted',
      [REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_ADMIN]: 'Escalated to admin',
      [REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_LEGAL]: 'Escalated to legal',
      [REPORT_CONSTANTS.ACTIONS.REPORT_DISMISSED]: 'Report dismissed',
      [REPORT_CONSTANTS.ACTIONS.REPORT_MERGED]: 'Report merged',
      [REPORT_CONSTANTS.ACTIONS.REPORT_DUPLICATE]: 'Report marked as duplicate',
    };

    return actionDescriptions[this.action] || 'Unknown action';
  }
}
