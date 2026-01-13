// Article Entity Constants
export const ARTICLE_CONSTANTS = {
  // Field lengths
  TITLE_MAX_LENGTH: 256,
  SLUG_MAX_LENGTH: 256,
  COVER_IMAGE_URL_MAX_LENGTH: 512,
  SUMMARY_MAX_LENGTH: 1000,
  TAGS_MAX_COUNT: 20,
  TAG_MAX_LENGTH: 50,

  // Status values
  STATUS: {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
  },

  // Visibility levels
  VISIBILITY: {
    PUBLIC: 'public',
    UNLISTED: 'unlisted',
    PRIVATE: 'private',
  },

  // Content formats
  CONTENT_FORMAT: {
    MARKDOWN: 'markdown',
    HTML: 'html',
  },
} as const;

// Type definitions for better TypeScript support
export type ArticleStatus =
  (typeof ARTICLE_CONSTANTS.STATUS)[keyof typeof ARTICLE_CONSTANTS.STATUS];
export type ArticleVisibility =
  (typeof ARTICLE_CONSTANTS.VISIBILITY)[keyof typeof ARTICLE_CONSTANTS.VISIBILITY];
export type ArticleContentFormat =
  (typeof ARTICLE_CONSTANTS.CONTENT_FORMAT)[keyof typeof ARTICLE_CONSTANTS.CONTENT_FORMAT];
