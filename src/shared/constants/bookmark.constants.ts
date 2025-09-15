/**
 * Bookmark System Constants
 *
 * Defines constants for the bookmark functionality
 * Similar to social media bookmark systems like Twitter, Instagram
 */

// Bookmarkable content types
export const BOOKMARKABLE_TYPES = {
  ARTICLE: 'article',
  COMMENT: 'comment',
  USER: 'user',
  MEDIA: 'media',
  STICKER: 'sticker',
  STICKER_PACK: 'sticker_pack',
} as const;

export type BookmarkableType =
  (typeof BOOKMARKABLE_TYPES)[keyof typeof BOOKMARKABLE_TYPES];

// Bookmark folder types
export const FOLDER_TYPES = {
  DEFAULT: 'default',
  CUSTOM: 'custom',
  FAVORITES: 'favorites',
  READ_LATER: 'read_later',
  ARCHIVED: 'archived',
} as const;

export type FolderType = (typeof FOLDER_TYPES)[keyof typeof FOLDER_TYPES];

// Bookmark status
export const BOOKMARK_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type BookmarkStatus =
  (typeof BOOKMARK_STATUS)[keyof typeof BOOKMARK_STATUS];

// Folder visibility
export const FOLDER_VISIBILITY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  UNLISTED: 'unlisted',
} as const;

export type FolderVisibility =
  (typeof FOLDER_VISIBILITY)[keyof typeof FOLDER_VISIBILITY];

// Bookmark sort options
export const BOOKMARK_SORT_OPTIONS = {
  CREATED_AT_DESC: 'createdAt_desc',
  CREATED_AT_ASC: 'createdAt_asc',
  UPDATED_AT_DESC: 'updatedAt_desc',
  UPDATED_AT_ASC: 'updatedAt_asc',
  TITLE_ASC: 'title_asc',
  TITLE_DESC: 'title_desc',
} as const;

export type BookmarkSortOption =
  (typeof BOOKMARK_SORT_OPTIONS)[keyof typeof BOOKMARK_SORT_OPTIONS];

// Main bookmark constants
export const BOOKMARK_CONSTANTS = {
  // Content types that can be bookmarked
  BOOKMARKABLE_TYPES,

  // Folder types
  FOLDER_TYPES,

  // Bookmark status
  BOOKMARK_STATUS,

  // Folder visibility
  FOLDER_VISIBILITY,

  // Sort options
  BOOKMARK_SORT_OPTIONS,

  // Field length limits
  FOLDER_NAME_MAX_LENGTH: 100,
  FOLDER_DESCRIPTION_MAX_LENGTH: 500,
  BOOKMARK_NOTE_MAX_LENGTH: 1000,

  // Pagination limits
  MAX_BOOKMARKS_PER_PAGE: 50,
  MAX_FOLDERS_PER_PAGE: 20,

  // Default folder names
  DEFAULT_FOLDER_NAMES: {
    [FOLDER_TYPES.FAVORITES]: 'Favorites',
    [FOLDER_TYPES.READ_LATER]: 'Read Later',
    [FOLDER_TYPES.ARCHIVED]: 'Archived',
  },

  // Cache keys
  CACHE_KEYS: {
    USER_BOOKMARKS: 'bookmarks:user',
    USER_FOLDERS: 'bookmarks:folders:user',
    BOOKMARK_COUNT: 'bookmarks:count:user',
    FOLDER_BOOKMARKS: 'bookmarks:folder',
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    USER_BOOKMARKS: 300, // 5 minutes
    USER_FOLDERS: 600, // 10 minutes
    BOOKMARK_COUNT: 180, // 3 minutes
    FOLDER_BOOKMARKS: 300, // 5 minutes
  },
} as const;
