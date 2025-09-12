import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Comment } from './comment.entity';
import { Media } from 'src/media/entities/media.entity';
import { Sticker } from 'src/stickers/entities/sticker.entity';
import { StickerFormat } from 'src/shared/constants';

/**
 * Comment Media Entity
 *
 * Junction table linking comments with media files.
 * Extended to support different media types including stickers.
 */
@Entity('comment_media')
@Unique(['commentId', 'mediaId'])
@Index(['commentId'])
@Index(['mediaId'])
@Index(['kind'])
@Index(['stickerId'])
@Index(['commentId', 'sortValue'])
export class CommentMedia extends BaseEntityCustom {
  /**
   * ID of the comment
   * Links to comments table
   */
  @Column({ type: 'bigint', nullable: false })
  commentId: string;

  /**
   * Comment information
   * Many-to-One relationship with Comment entity
   */
  @ManyToOne(() => Comment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentId', referencedColumnName: 'id' })
  comment: Comment;

  /**
   * ID of the media file
   * Links to media table
   */
  @Column({ type: 'bigint', nullable: false })
  mediaId: string;

  /**
   * Media information
   * Many-to-One relationship with Media entity
   */
  @ManyToOne(() => Media, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mediaId', referencedColumnName: 'id' })
  media: Media;

  /**
   * Type of media attachment
   * Examples: 'image', 'video', 'document', 'sticker'
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'image',
  })
  kind: string;

  /**
   * Media URL for direct access
   * Cached from media.url for performance
   */
  @Column({ type: 'text', nullable: true })
  url: string;

  /**
   * Additional metadata for the media
   * JSON field for storing media-specific data
   */
  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  /**
   * Sort order for display within the comment
   * Default: 0
   */
  @Column({ type: 'int', default: 0 })
  sortValue: number;

  // Sticker-specific fields (nullable for non-sticker media)

  /**
   * ID of the sticker (if kind='sticker')
   * Links to stickers table
   */
  @Column({ type: 'bigint', nullable: true })
  stickerId: string;

  /**
   * Sticker information (if kind='sticker')
   * Many-to-One relationship with Sticker entity
   */
  @ManyToOne(() => Sticker, {
    nullable: true,
    onDelete: 'SET NULL', // Set to null if sticker is deleted
  })
  @JoinColumn({ name: 'stickerId', referencedColumnName: 'id' })
  sticker: Sticker;

  /**
   * Sticker name snapshot (if kind='sticker')
   * Cached for performance and historical accuracy
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  stickerName: string;

  /**
   * Sticker tags snapshot (if kind='sticker')
   * Cached for performance and historical accuracy
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stickerTags: string;

  /**
   * Sticker format snapshot (if kind='sticker')
   * Cached for performance and historical accuracy
   */
  @Column({
    type: 'enum',
    enum: ['png', 'apng', 'gif', 'lottie'],
    nullable: true,
  })
  stickerFormat: StickerFormat;

  /**
   * Check if this is a sticker attachment
   * @returns {boolean} True if kind is 'sticker'
   */
  isSticker(): boolean {
    return this.kind === 'sticker';
  }

  /**
   * Get sticker tags as array
   * @returns {string[]} Array of tag strings
   */
  getStickerTagsArray(): string[] {
    if (!this.stickerTags) return [];
    return this.stickerTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  /**
   * Set sticker tags from array
   * @param tags Array of tag strings
   */
  setStickerTagsArray(tags: string[]): void {
    this.stickerTags = tags.filter((tag) => tag.trim().length > 0).join(',');
  }
}
