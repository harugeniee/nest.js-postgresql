import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
  ArticleStatus,
  ArticleVisibility,
  ArticleContentFormat,
  ARTICLE_CONSTANTS,
} from 'src/shared/constants';

/**
 * Article entity representing blog posts and articles
 *
 * Features:
 * - Comprehensive article metadata including SEO fields
 * - Content management with multiple formats support
 * - Visibility and status controls for publishing workflow
 * - Analytics tracking (views, likes, bookmarks, comments)
 * - Tagging system for categorization
 * - Soft delete support for data retention
 */
@Entity({ name: 'articles' })
export class Article extends BaseEntityCustom {
  /**
   * Foreign key reference to the author (user) who created this article
   * Maps to users.id but without explicit FK constraint
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  //   authorId: string;
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Article title with maximum length of 256 characters
   * Indexed for search functionality
   */
  @Index()
  @Column({
    type: 'varchar',
    length: ARTICLE_CONSTANTS.TITLE_MAX_LENGTH,
    nullable: false,
    comment: 'Article title, maximum 256 characters',
  })
  title: string;

  /**
   * URL-friendly slug for SEO and routing
   * Must be unique across all articles
   */
  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: ARTICLE_CONSTANTS.SLUG_MAX_LENGTH,
    nullable: false,
    comment: 'URL-friendly slug, must be unique',
  })
  slug: string;

  /**
   * Optional article summary for previews and SEO
   * Can be null if not provided
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Article summary for previews and SEO',
  })
  summary?: string;

  /**
   * Main article content
   * Stored as text to support long-form content
   */
  @Column({
    type: 'text',
    nullable: false,
    comment: 'Main article content',
  })
  content: string;

  /**
   * Content format specification
   * Supports markdown and HTML formats
   * Defaults to markdown for better content management
   */
  @Column({
    type: 'enum',
    enum: ARTICLE_CONSTANTS.CONTENT_FORMAT,
    default: ARTICLE_CONSTANTS.CONTENT_FORMAT.HTML,
    nullable: false,
    comment: 'Content format: markdown or html',
  })
  contentFormat: ArticleContentFormat;

  /**
   * Article visibility level
   * Controls who can view the article
   * Defaults to public for immediate publishing
   */
  @Column({
    type: 'enum',
    enum: ARTICLE_CONSTANTS.VISIBILITY,
    default: ARTICLE_CONSTANTS.VISIBILITY.PUBLIC,
    nullable: false,
    comment: 'Article visibility: public, unlisted, or private',
  })
  visibility: ArticleVisibility;

  /**
   * Article publication status
   * Manages the publishing workflow
   * Defaults to draft for content creation
   * - draft: Article is being written/edited
   * - scheduled: Article is scheduled for future publication
   * - published: Article is live and visible to public
   * - archived: Article is archived and hidden
   */
  @Column({
    type: 'enum',
    enum: ARTICLE_CONSTANTS.STATUS,
    default: ARTICLE_CONSTANTS.STATUS.DRAFT,
    nullable: false,
    comment: 'Article status: draft, scheduled, published, or archived',
  })
  status: ArticleStatus;

  /**
   * Array of tags for categorization and search
   * Stored as JSON array of strings
   * Can be null if no tags are assigned
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Array of tags for categorization',
  })
  tags?: string[];

  /**
   * URL of the cover image for the article
   * Can be null if no cover image is set
   */
  @Column({
    type: 'varchar',
    length: ARTICLE_CONSTANTS.COVER_IMAGE_URL_MAX_LENGTH,
    nullable: true,
    comment: 'URL of the article cover image',
  })
  coverImageUrl?: string;

  /**
   * Estimated word count of the article
   * Used for reading time calculation and analytics
   * Can be null if not calculated
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated word count of the article',
  })
  wordCount?: number;

  /**
   * Estimated reading time in minutes
   * Calculated based on word count and average reading speed
   * Can be null if not calculated
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated reading time in minutes',
  })
  readTimeMinutes?: number;

  /**
   * Total number of views for this article
   * Used for analytics and popularity metrics
   * Defaults to 0 for new articles
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of article views',
  })
  viewsCount: number;

  /**
   * Total number of likes for this article
   * Used for engagement metrics
   * Defaults to 0 for new articles
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of article likes',
  })
  likesCount: number;

  /**
   * Total number of bookmarks for this article
   * Used for engagement and save metrics
   * Defaults to 0 for new articles
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of article bookmarks',
  })
  bookmarksCount: number;

  /**
   * Total number of comments on this article
   * Used for engagement metrics
   * Defaults to 0 for new articles
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of article comments',
  })
  commentsCount: number;

  /**
   * Scheduled publication date and time
   * Set when article is scheduled for future publication
   * Used for scheduled publishing feature
   * Can be null for non-scheduled articles
   */
  @Index()
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date and time when article is scheduled to be published',
  })
  scheduledAt?: Date;

  /**
   * Actual publication date and time
   * Set when article status changes to published
   * Can be null for draft or scheduled articles
   */
  @Index()
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Date and time when article was actually published',
  })
  publishedAt?: Date;
}
