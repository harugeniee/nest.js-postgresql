import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Media } from 'src/media/entities/media.entity';
import { User } from 'src/users/entities/user.entity';
import {
  STICKER_CONSTANTS,
  StickerFormat,
  StickerStatus,
} from 'src/shared/constants';

/**
 * Sticker Entity
 *
 * Stores sticker information linked to media files.
 * Stickers are small images/animations used in comments and messages.
 */
@Entity('stickers')
@Unique(['mediaId'])
@Index(['name'])
@Index(['available', 'status'])
@Index(['format'])
@Index(['createdBy'])
export class Sticker extends BaseEntityCustom {
  /**
   * ID of the associated media file
   * Links to media table - stickers reuse the existing media storage system
   */
  @Column({ type: 'bigint', nullable: false })
  mediaId: string;

  /**
   * Media information for the sticker file
   * Many-to-One relationship with Media entity
   */
  @ManyToOne(() => Media, { nullable: false })
  @JoinColumn({ name: 'mediaId', referencedColumnName: 'id' })
  media: Media;

  /**
   * Sticker name for identification
   * Maximum length: STICKER_CONSTANTS.NAME_MAX_LENGTH characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  /**
   * Comma-separated tags for categorization and search
   * Maximum length: STICKER_CONSTANTS.TAGS_MAX_LENGTH characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.TAGS_MAX_LENGTH,
    nullable: true,
  })
  tags: string;

  /**
   * Short description of the sticker
   * Maximum length: STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH characters
   */
  @Column({
    type: 'varchar',
    length: STICKER_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description: string;

  /**
   * Sticker format (png, apng, gif, lottie)
   * Determined from media file type
   */
  @Column({
    type: 'enum',
    enum: STICKER_CONSTANTS.FORMATS,
    nullable: false,
  })
  format: StickerFormat;

  /**
   * Whether the sticker is available for use
   * Default: true
   */
  @Column({ type: 'boolean', default: true })
  available: boolean;

  /**
   * Sticker status for moderation workflow
   * Default: 'approved'
   */
  @Column({
    type: 'enum',
    enum: STICKER_CONSTANTS.STATUS,
    default: STICKER_CONSTANTS.STATUS.APPROVED,
  })
  status: StickerStatus;

  /**
   * Sticker width in pixels
   * Extracted from media metadata
   */
  @Column({ type: 'int', nullable: true })
  width: number;

  /**
   * Sticker height in pixels
   * Extracted from media metadata
   */
  @Column({ type: 'int', nullable: true })
  height: number;

  /**
   * Duration in milliseconds for animated stickers
   * Null for static stickers
   */
  @Column({ type: 'int', nullable: true })
  durationMs: number;

  /**
   * Sort order for display
   * Default: 0
   */
  @Column({ type: 'int', default: 0 })
  sortValue: number;

  /**
   * ID of the user who created the sticker
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: true })
  createdBy: string;

  /**
   * User information who created the sticker
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy', referencedColumnName: 'id' })
  creator: User;

  /**
   * ID of the user who last updated the sticker
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: true })
  updatedBy: string;

  /**
   * User information who last updated the sticker
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy', referencedColumnName: 'id' })
  updater: User;

  /**
   * Get sticker dimensions as string
   * @returns {string} Dimensions string (e.g., "320x320")
   */
  getDimensions(): string | null {
    if (this.width && this.height) {
      return `${this.width}x${this.height}`;
    }
    return null;
  }

  /**
   * Check if sticker is animated
   * @returns {boolean} True if sticker has duration
   */
  isAnimated(): boolean {
    return this.durationMs !== null && this.durationMs > 0;
  }

  /**
   * Check if sticker is available for use
   * @returns {boolean} True if available and approved
   */
  isUsable(): boolean {
    return this.available && this.status === STICKER_CONSTANTS.STATUS.APPROVED;
  }

  /**
   * Get tags as array
   * @returns {string[]} Array of tag strings
   */
  getTagsArray(): string[] {
    if (!this.tags) return [];
    return this.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  /**
   * Set tags from array
   * @param tags Array of tag strings
   */
  setTagsArray(tags: string[]): void {
    this.tags = tags.filter((tag) => tag.trim().length > 0).join(',');
  }
}
