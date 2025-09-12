// Comment Entity Constants
export const COMMENT_CONSTANTS = {
  // Field lengths
  CONTENT_MAX_LENGTH: 2000,
  SUBJECT_TYPE_MAX_LENGTH: 32,
  TYPE_MAX_LENGTH: 20,
  VISIBILITY_MAX_LENGTH: 20,
  MENTION_TYPE_MAX_LENGTH: 20,
  PROCESSING_STATUS_MAX_LENGTH: 20,
  ATTACHMENT_TYPE_MAX_LENGTH: 20,
  FILENAME_MAX_LENGTH: 255,
  CONTENT_TYPE_MAX_LENGTH: 100,
  URL_MAX_LENGTH: 500,
  CDN_URL_MAX_LENGTH: 500,
  THUMBNAIL_URL_MAX_LENGTH: 500,

  // Comment types
  TYPES: {
    TEXT: 'text',
    RICH: 'rich',
    EMBED: 'embed',
    SYSTEM: 'system',
  },

  // Comment visibility levels
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    HIDDEN: 'hidden',
    DELETED: 'deleted',
  },

  // Subject types that can be commented on
  SUBJECT_TYPES: {
    ARTICLE: 'article',
    POST: 'post',
    COMMENT: 'comment',
    USER: 'user',
    MEDIA: 'media',
    EVENT: 'event',
    PRODUCT: 'product',
  },

  // Comment flags for moderation
  FLAGS: {
    SPAM: 'spam',
    INAPPROPRIATE: 'inappropriate',
    OFFENSIVE: 'offensive',
    HARASSMENT: 'harassment',
    HATE_SPEECH: 'hate_speech',
    VIOLENCE: 'violence',
    COPYRIGHT: 'copyright',
    MISINFORMATION: 'misinformation',
  },

  // Mention types
  MENTION_TYPES: {
    USER: 'user',
    ROLE: 'role',
    CHANNEL: 'channel',
    EVERYONE: 'everyone',
    HERE: 'here',
  },

  // Attachment types
  ATTACHMENT_TYPES: {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    ARCHIVE: 'archive',
    PRESENTATION: 'presentation',
    SPREADSHEET: 'spreadsheet',
    OTHER: 'other',
  },

  // Processing status for attachments
  PROCESSING_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MAX_REPLY_DEPTH: 10,
  },

  // Cache settings
  CACHE: {
    TTL_SEC: 300, // 5 minutes
    SWR_SEC: 60, // 1 minute
    PREFIX: 'comments',
    STATS_TTL_SEC: 300, // 5 minutes
  },

  // Rate limiting
  RATE_LIMITS: {
    CREATE_PER_MINUTE: 10,
    UPDATE_PER_MINUTE: 20,
    DELETE_PER_MINUTE: 5,
    MAX_ATTACHMENTS_PER_COMMENT: 10,
    MAX_MENTIONS_PER_COMMENT: 50,
  },

  // Search and filtering
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_QUERY_LENGTH: 100,
    DEFAULT_SORT_BY: 'recent',
    SORT_OPTIONS: ['recent', 'oldest', 'popular', 'most_replied'],
  },

  // WebSocket events
  WS_EVENTS: {
    COMMENT_CREATED: 'comment:created',
    COMMENT_UPDATED: 'comment:updated',
    COMMENT_DELETED: 'comment:deleted',
    COMMENT_PINNED: 'comment:pinned',
    MENTION_CREATED: 'mention:created',
    REACTION_ADDED: 'reaction:added',
    REACTION_REMOVED: 'reaction:removed',
  },

  // Validation rules
  VALIDATION: {
    CONTENT_MIN_LENGTH: 1,
    CONTENT_MAX_LENGTH: 2000,
    MAX_ATTACHMENTS: 10,
    MAX_MENTIONS: 50,
    MAX_REPLY_DEPTH: 10,
    MAX_FLAGS: 5,
  },

  // Database constraints
  DATABASE: {
    CONTENT_COLUMN_TYPE: 'text',
    METADATA_COLUMN_TYPE: 'jsonb',
    FLAGS_COLUMN_TYPE: 'jsonb',
    CONTEXT_COLUMN_TYPE: 'jsonb',
  },

  // Notification settings
  NOTIFICATIONS: {
    MENTION_NOTIFICATION_DELAY_MS: 1000,
    BATCH_NOTIFICATION_SIZE: 100,
    NOTIFICATION_RETRY_ATTEMPTS: 3,
    NOTIFICATION_RETRY_DELAY_MS: 5000,
  },

  // Moderation settings
  MODERATION: {
    AUTO_FLAG_KEYWORDS: ['spam', 'scam', 'fake'],
    CONTENT_FILTER_ENABLED: true,
    AUTO_DELETE_THRESHOLD: 5, // Number of flags before auto-delete
    MODERATOR_REVIEW_THRESHOLD: 3, // Number of flags before moderator review
  },

  // Analytics and metrics
  METRICS: {
    COMMENT_CREATION: 'comment.creation',
    COMMENT_UPDATE: 'comment.update',
    COMMENT_DELETION: 'comment.deletion',
    COMMENT_VIEW: 'comment.view',
    MENTION_CREATION: 'mention.creation',
    ATTACHMENT_UPLOAD: 'attachment.upload',
    REACTION_ADDITION: 'reaction.addition',
  },
} as const;

// Type definitions for better TypeScript support
export type CommentType =
  (typeof COMMENT_CONSTANTS.TYPES)[keyof typeof COMMENT_CONSTANTS.TYPES];

export type CommentVisibility =
  (typeof COMMENT_CONSTANTS.VISIBILITY)[keyof typeof COMMENT_CONSTANTS.VISIBILITY];

export type SubjectType =
  (typeof COMMENT_CONSTANTS.SUBJECT_TYPES)[keyof typeof COMMENT_CONSTANTS.SUBJECT_TYPES];

export type CommentFlag =
  (typeof COMMENT_CONSTANTS.FLAGS)[keyof typeof COMMENT_CONSTANTS.FLAGS];

export type MentionType =
  (typeof COMMENT_CONSTANTS.MENTION_TYPES)[keyof typeof COMMENT_CONSTANTS.MENTION_TYPES];

export type AttachmentType =
  (typeof COMMENT_CONSTANTS.ATTACHMENT_TYPES)[keyof typeof COMMENT_CONSTANTS.ATTACHMENT_TYPES];

export type ProcessingStatus =
  (typeof COMMENT_CONSTANTS.PROCESSING_STATUS)[keyof typeof COMMENT_CONSTANTS.PROCESSING_STATUS];

export type CommentSortOption =
  (typeof COMMENT_CONSTANTS.SEARCH.SORT_OPTIONS)[number];

export type CommentWsEvent =
  (typeof COMMENT_CONSTANTS.WS_EVENTS)[keyof typeof COMMENT_CONSTANTS.WS_EVENTS];

export type CommentMetric =
  (typeof COMMENT_CONSTANTS.METRICS)[keyof typeof COMMENT_CONSTANTS.METRICS];

export type CommentMentionType =
  (typeof COMMENT_CONSTANTS.MENTION_TYPES)[keyof typeof COMMENT_CONSTANTS.MENTION_TYPES];
