import { User } from 'src/users/entities/user.entity';
import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { BookmarkFolder } from './bookmark-folder.entity';
import {
  BOOKMARK_CONSTANTS,
  BookmarkableType,
  BookmarkStatus,
} from 'src/shared/constants';

/**
 * Bookmark Entity
 *
 * Represents a saved bookmark for various content types
 * Similar to browser bookmarks or social media saves
 */
@Entity('bookmarks')
@Index(['userId'])
@Index(['bookmarkableType', 'bookmarkableId'])
@Index(['folderId'])
@Index(['status'])
@Unique(['userId', 'bookmarkableType', 'bookmarkableId'])
export class Bookmark extends BaseEntityCustom {
  /**
   * ID of the user who created this bookmark
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User who created this bookmark
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Type of content being bookmarked
   * Examples: 'article', 'comment', 'user', 'media'
   */
  @Column({
    type: 'varchar',
    nullable: false,
    enum: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES,
  })
  bookmarkableType: BookmarkableType;

  /**
   * ID of the content being bookmarked
   * References the actual content in the respective table
   */
  @Column({ type: 'bigint', nullable: false })
  bookmarkableId: string;

  /**
   * ID of the folder this bookmark belongs to
   * Links to bookmark_folders table
   */
  @Column({ type: 'bigint', nullable: true })
  folderId?: string;

  /**
   * Folder this bookmark belongs to
   * Many-to-One relationship with BookmarkFolder entity
   */
  @ManyToOne(() => BookmarkFolder, (folder) => folder.bookmarks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'folderId', referencedColumnName: 'id' })
  folder?: BookmarkFolder;

  /**
   * Status of the bookmark
   * Controls visibility and behavior
   */
  @Column({
    type: 'varchar',
    nullable: false,
    enum: BOOKMARK_CONSTANTS.BOOKMARK_STATUS,
    default: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
  })
  status: BookmarkStatus;

  /**
   * Optional note about this bookmark
   * User's personal notes about the bookmarked content
   */
  @Column({
    type: 'varchar',
    length: BOOKMARK_CONSTANTS.BOOKMARK_NOTE_MAX_LENGTH,
    nullable: true,
  })
  note?: string;

  /**
   * Tags for organizing bookmarks
   * Comma-separated list of tags
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  tags?: string;

  /**
   * Whether this bookmark is marked as favorite
   * Favorites get special treatment in UI
   */
  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isFavorite: boolean;

  /**
   * Whether this bookmark is marked as read later
   * Read later bookmarks are for content to be consumed later
   */
  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isReadLater: boolean;

  /**
   * Sort order within the folder
   * Lower numbers appear first
   */
  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
  })
  sortOrder: number;

  /**
   * Additional metadata for the bookmark
   * JSON field for storing bookmark-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  /**
   * Check if this bookmark is active
   * @returns {boolean} True if bookmark is active
   */
  isActive(): boolean {
    return this.status === BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE;
  }

  /**
   * Check if this bookmark is archived
   * @returns {boolean} True if bookmark is archived
   */
  isArchived(): boolean {
    return this.status === BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED;
  }

  /**
   * Check if this bookmark is deleted
   * @returns {boolean} True if bookmark is deleted
   */
  isDeleted(): boolean {
    return this.status === BOOKMARK_CONSTANTS.BOOKMARK_STATUS.DELETED;
  }

  /**
   * Get parsed tags as an array
   * @returns {string[]} Array of tag strings
   */
  getTagsArray(): string[] {
    if (!this.tags) {
      return [];
    }
    return this.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  /**
   * Set tags from an array
   * @param tags - Array of tag strings
   */
  setTagsArray(tags: string[]): void {
    this.tags = tags.filter((tag) => tag.trim().length > 0).join(', ');
  }

  /**
   * Add a tag to the bookmark
   * @param tag - Tag to add
   */
  addTag(tag: string): void {
    const tags = this.getTagsArray();
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      tags.push(trimmedTag);
      this.setTagsArray(tags);
    }
  }

  /**
   * Remove a tag from the bookmark
   * @param tag - Tag to remove
   */
  removeTag(tag: string): void {
    const tags = this.getTagsArray();
    const trimmedTag = tag.trim();
    const index = tags.indexOf(trimmedTag);
    if (index > -1) {
      tags.splice(index, 1);
      this.setTagsArray(tags);
    }
  }

  /**
   * Check if bookmark has a specific tag
   * @param tag - Tag to check for
   * @returns {boolean} True if bookmark has the tag
   */
  hasTag(tag: string): boolean {
    return this.getTagsArray().includes(tag.trim());
  }

  /**
   * Get a summary of the bookmark
   * @returns {object} Bookmark summary
   */
  getSummary(): {
    id: string;
    bookmarkableType: BookmarkableType;
    bookmarkableId: string;
    status: BookmarkStatus;
    isFavorite: boolean;
    isReadLater: boolean;
    tags: string[];
    note?: string;
  } {
    return {
      id: this.id,
      bookmarkableType: this.bookmarkableType,
      bookmarkableId: this.bookmarkableId,
      status: this.status,
      isFavorite: this.isFavorite,
      isReadLater: this.isReadLater,
      tags: this.getTagsArray(),
      note: this.note,
    };
  }
}
