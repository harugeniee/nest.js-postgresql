import { User } from 'src/users/entities/user.entity';
import { Comment } from './comment.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  COMMENT_CONSTANTS,
  CommentMentionType,
} from 'src/shared/constants/comment.constants';

/**
 * Comment Mention Entity
 *
 * Stores user mentions within comments.
 * Tracks which users are mentioned in which comments for notifications and UI highlighting.
 */
@Entity('comment_mentions')
@Unique(['commentId', 'userId'])
@Index(['commentId'])
@Index(['userId'])
export class CommentMention extends BaseEntityCustom {
  /**
   * ID of the comment containing the mention
   * Links to comments table
   */
  @Column({ type: 'bigint', nullable: true })
  commentId: string;

  /**
   * Comment information containing the mention
   * Many-to-One relationship with Comment entity
   */
  @ManyToOne(() => Comment, (_) => _.mentions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId', referencedColumnName: 'id' })
  comment: Comment;

  /**
   * ID of the user being mentioned
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: true })
  userId: string;

  /**
   * User information being mentioned
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Position of the mention in the comment content
   * Starting character index (0-based)
   */
  @Column({ type: 'int', nullable: false })
  startIndex: number;

  /**
   * Length of the mention in the comment content
   * Number of characters the mention spans
   */
  @Column({ type: 'int', nullable: false })
  length: number;

  /**
   * Type of mention
   * Examples: 'user', 'role', 'channel', 'everyone', 'here'
   * Default: 'user'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: COMMENT_CONSTANTS.MENTION_TYPES.USER,
  })
  type: CommentMentionType;

  /**
   * Whether the mention is silent (no notification sent)
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  silent: boolean;

  /**
   * Whether the mention notification has been sent
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  /**
   * Timestamp when the mention notification was sent
   * Null if not sent yet
   */
  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt: Date;

  /**
   * Additional context for the mention
   * JSON field for storing mention-specific data like role info, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;
}
