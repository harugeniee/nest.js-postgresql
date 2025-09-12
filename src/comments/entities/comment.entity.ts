import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Media } from 'src/media/entities/media.entity';
import { CommentMention } from 'src/comments/entities/comment-mention.entity';
import {
  COMMENT_CONSTANTS,
  CommentFlag,
  CommentType,
  CommentVisibility,
} from 'src/shared/constants';

/**
 * Comment Entity
 *
 * Stores user comments on various objects like articles, posts, other comments, etc.
 * Similar to Discord messages with support for content, attachments, and mentions.
 */
@Entity('comments')
@Index(['subjectType', 'subjectId'])
@Index(['userId'])
@Index(['parentId'])
export class Comment extends BaseEntityCustom {
  /**
   * ID of the user who created the comment
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User information who created the comment
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Type of object being commented on
   * Examples: 'article', 'post', 'comment', 'user', etc.
   * Maximum length: 32 characters
   */
  @Column({ type: 'varchar', length: 32, nullable: false })
  subjectType: string;

  /**
   * ID of the object being commented on
   * Examples: article ID, post ID, parent comment ID, etc.
   */
  @Column({ type: 'bigint', nullable: false })
  subjectId: string;

  /**
   * Parent comment ID for nested comments/replies
   * Null for top-level comments
   */
  @Column({ type: 'bigint', nullable: true })
  parentId: string;

  /**
   * Parent comment information for nested comments
   * Self-referencing relationship
   */
  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parentId', referencedColumnName: 'id' })
  parent: Comment;

  /**
   * Child comments (replies)
   * One-to-Many relationship with self
   */
  @OneToMany(() => Comment, (_) => _.parent)
  replies: Comment[];

  /**
   * Comment content/text
   * Maximum length: 2000 characters (similar to Discord)
   */
  @Column({ type: 'text', nullable: false })
  content: string;

  /**
   * Comment type for different content formats
   * Examples: 'text', 'rich', 'embed', 'system'
   * Default: 'text'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: COMMENT_CONSTANTS.TYPES.TEXT,
  })
  type: CommentType;

  /**
   * Whether the comment is pinned
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  /**
   * Whether the comment is edited
   * Default: false
   */
  @Column({ type: 'boolean', default: false })
  edited: boolean;

  /**
   * Timestamp when the comment was last edited
   * Null if never edited
   */
  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date;

  /**
   * Comment attachments (files, images, etc.)
   * Many-to-Many relationship with Media entity
   * Uses a junction table to link comments with media files
   */
  @ManyToMany(() => Media, { cascade: false })
  @JoinTable({
    name: 'comment_media',
    joinColumn: {
      name: 'commentId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'mediaId',
      referencedColumnName: 'id',
    },
  })
  attachments: Media[];

  /**
   * User mentions in the comment
   * One-to-Many relationship with CommentMention
   */
  @OneToMany(() => CommentMention, (_) => _.comment, {
    cascade: true,
  })
  mentions: CommentMention[];

  /**
   * Additional metadata for rich content
   * JSON field for storing structured data like embeds, formatting, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Comment flags for moderation
   * Examples: 'spam', 'inappropriate', 'offensive'
   * JSON array of flag strings
   */
  @Column({ type: 'jsonb', default: '[]' })
  flags: CommentFlag[];

  /**
   * Comment visibility status
   * Examples: 'public', 'private', 'hidden', 'deleted'
   * Default: 'public'
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: COMMENT_CONSTANTS.VISIBILITY.PUBLIC,
  })
  visibility: CommentVisibility;

  /**
   * Total number of replies to this comment
   * Automatically updated when replies are added/removed
   * Default: 0
   */
  @Column({ type: 'integer', default: 0 })
  replyCount: number;
}
