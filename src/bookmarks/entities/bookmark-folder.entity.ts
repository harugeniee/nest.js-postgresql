import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Bookmark } from './bookmark.entity';
import {
  BOOKMARK_CONSTANTS,
  FolderType,
  FolderVisibility,
} from 'src/shared/constants';

/**
 * Bookmark Folder Entity
 *
 * Represents a folder to organize bookmarks
 * Similar to browser bookmarks or social media collections
 */
@Entity('bookmark_folders')
@Index(['userId'])
@Index(['type'])
@Index(['visibility'])
@Index(['isDefault'])
export class BookmarkFolder extends BaseEntityCustom {
  /**
   * ID of the user who owns this folder
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User who owns this folder
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Name of the folder
   * User-friendly display name
   */
  @Column({
    type: 'varchar',
    length: BOOKMARK_CONSTANTS.FOLDER_NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  /**
   * Optional description of the folder
   * Additional context about the folder's purpose
   */
  @Column({
    type: 'varchar',
    length: BOOKMARK_CONSTANTS.FOLDER_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description?: string;

  /**
   * Type of folder (default, custom, favorites, etc.)
   * Determines folder behavior and permissions
   */
  @Column({
    type: 'varchar',
    nullable: false,
    enum: BOOKMARK_CONSTANTS.FOLDER_TYPES,
    default: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
  })
  type: FolderType;

  /**
   * Visibility of the folder
   * Controls who can see this folder
   */
  @Column({
    type: 'varchar',
    nullable: false,
    enum: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY,
    default: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
  })
  visibility: FolderVisibility;

  /**
   * Whether this is a default folder
   * Default folders cannot be deleted and have special behavior
   */
  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isDefault: boolean;

  /**
   * Sort order for folder display
   * Lower numbers appear first
   */
  @Column({
    type: 'integer',
    nullable: false,
    default: 0,
  })
  sortOrder: number;

  /**
   * Color theme for the folder
   * Optional visual customization
   */
  @Column({
    type: 'varchar',
    length: 7, // Hex color code
    nullable: true,
  })
  color?: string;

  /**
   * Icon for the folder
   * Optional visual identifier
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  icon?: string;

  /**
   * Additional metadata for the folder
   * JSON field for storing folder-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  /**
   * Bookmarks in this folder
   * One-to-Many relationship with Bookmark entity
   */
  @OneToMany(() => Bookmark, (bookmark) => bookmark.folder)
  bookmarks: Bookmark[];

  /**
   * Check if this is a system folder
   * System folders have special restrictions
   */
  isSystemFolder(): boolean {
    return (
      this.isDefault || this.type === BOOKMARK_CONSTANTS.FOLDER_TYPES.DEFAULT
    );
  }

  /**
   * Check if this folder can be deleted
   * System folders and folders with bookmarks cannot be deleted
   */
  canBeDeleted(): boolean {
    return (
      !this.isSystemFolder() && (!this.bookmarks || this.bookmarks.length === 0)
    );
  }

  /**
   * Check if this folder is visible to a specific user
   * @param userId - ID of the user to check visibility for
   * @returns {boolean} True if folder is visible to the user
   */
  isVisibleTo(userId: string): boolean {
    if (this.userId === userId) {
      return true; // Owner can always see their folders
    }

    return this.visibility === BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC;
  }

  /**
   * Get the display name for the folder
   * Returns localized name for default folders
   */
  getDisplayName(): string {
    if (this.isDefault && BOOKMARK_CONSTANTS.DEFAULT_FOLDER_NAMES[this.type]) {
      return BOOKMARK_CONSTANTS.DEFAULT_FOLDER_NAMES[this.type];
    }
    return this.name;
  }

  /**
   * Get folder statistics
   * @returns {object} Folder statistics
   */
  getStats(): { totalBookmarks: number; activeBookmarks: number } {
    const totalBookmarks = this.bookmarks?.length || 0;
    const activeBookmarks =
      this.bookmarks?.filter(
        (bookmark) =>
          bookmark.status === BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
      ).length || 0;

    return {
      totalBookmarks,
      activeBookmarks,
    };
  }
}
