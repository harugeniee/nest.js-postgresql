/**
 * Analytics Constants
 * Defines all constants related to analytics tracking and metrics
 */

/**
 * Event to Metric Type Mapping Constants
 * Maps event types to their corresponding metric types for analytics tracking
 */
export const EVENT_METRIC_MAPPING = {
  article: {
    view: 'article_views',
    like: 'article_likes',
    comment: 'article_comments',
    share: 'article_shares',
  },
  user: {
    follow: 'user_follows',
    unfollow: 'user_unfollows',
  },
  reaction: {
    set: 'reaction_count',
  },
  bookmark: {
    create: 'bookmark_count',
  },
  comment: {
    create: 'comment_count',
    like: 'comment_likes',
  },
} as const;

/**
 * Analytics Event Types
 * Defines all possible event types that can be tracked
 */
export const ANALYTICS_EVENT_TYPES = {
  // Article events
  ARTICLE_VIEW: 'article_view',
  ARTICLE_LIKE: 'article_like',
  ARTICLE_COMMENT: 'article_comment',
  ARTICLE_SHARE: 'article_share',
  ARTICLE_CREATE: 'article_create',
  ARTICLE_UPDATE: 'article_update',
  ARTICLE_DELETE: 'article_delete',
  ARTICLE_LIST: 'article_list',

  // User events
  USER_FOLLOW: 'user_follow',
  USER_UNFOLLOW: 'user_unfollow',

  // Reaction events
  REACTION_SET: 'reaction_set',

  // Bookmark events
  BOOKMARK_CREATE: 'bookmark_create',

  // Comment events
  COMMENT_CREATE: 'comment_create',
  COMMENT_LIKE: 'comment_like',

  // System events
  PAGE_VIEW: 'page_view',
  SYSTEM_EVENT: 'system_event',
} as const;

/**
 * Analytics Event Categories
 * Groups events by their functional category
 */
export const ANALYTICS_EVENT_CATEGORIES = {
  CONTENT: 'content',
  SOCIAL: 'social',
  ENGAGEMENT: 'engagement',
  SYSTEM: 'system',
  USER: 'user',
} as const;

/**
 * Analytics Subject Types
 * Defines what types of content can be tracked
 */
export const ANALYTICS_SUBJECT_TYPES = {
  ARTICLE: 'article',
  COMMENT: 'comment',
  USER: 'user',
  MEDIA: 'media',
  STICKER: 'sticker',
  STICKER_PACK: 'sticker_pack',
  BOOKMARK_FOLDER: 'bookmark_folder',
  QR_TICKET: 'qr_ticket',
  REACTION: 'reaction',
} as const;

/**
 * Analytics Metric Types
 * Defines the different types of metrics that can be aggregated
 */
export const ANALYTICS_METRIC_TYPES = {
  ARTICLE_VIEWS: 'article_views',
  ARTICLE_LIKES: 'article_likes',
  ARTICLE_COMMENTS: 'article_comments',
  ARTICLE_SHARES: 'article_shares',
  USER_FOLLOWS: 'user_follows',
  USER_UNFOLLOWS: 'user_unfollows',
  REACTION_COUNT: 'reaction_count',
  BOOKMARK_COUNT: 'bookmark_count',
  COMMENT_COUNT: 'comment_count',
  COMMENT_LIKES: 'comment_likes',
} as const;

/**
 * Analytics Time Granularity Options
 * Defines how time-series data can be aggregated
 */
export const ANALYTICS_TIME_GRANULARITY = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

/**
 * Analytics Cache Configuration
 */
export const ANALYTICS_CACHE_CONFIG = {
  TTL_SEC: 300, // 5 minutes
  SWR_SEC: 60, // 1 minute
  PREFIX: 'analytics',
  METRICS_TTL_SEC: 600, // 10 minutes
  DASHBOARD_TTL_SEC: 300, // 5 minutes
} as const;

/**
 * Analytics Pagination Defaults
 */
export const ANALYTICS_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000,
  DASHBOARD_LIMIT: 10000,
} as const;

/**
 * Analytics Rate Limiting
 */
export const ANALYTICS_RATE_LIMITS = {
  TRACK_EVENTS_PER_MINUTE: 100,
  QUERY_ANALYTICS_PER_MINUTE: 30,
  DASHBOARD_QUERIES_PER_MINUTE: 10,
} as const;

/**
 * Analytics Default Time Ranges
 */
export const ANALYTICS_TIME_RANGES = {
  LAST_24_HOURS: '1d',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
} as const;

/**
 * Main Analytics Constants Object
 */
export const ANALYTICS_CONSTANTS = {
  // Event to metric mapping
  EVENT_METRIC_MAPPING,

  // Event types
  EVENT_TYPES: ANALYTICS_EVENT_TYPES,

  // Event categories
  EVENT_CATEGORIES: ANALYTICS_EVENT_CATEGORIES,

  // Subject types
  SUBJECT_TYPES: ANALYTICS_SUBJECT_TYPES,

  // Metric types
  METRIC_TYPES: ANALYTICS_METRIC_TYPES,

  // Time granularity
  TIME_GRANULARITY: ANALYTICS_TIME_GRANULARITY,

  // Cache configuration
  CACHE: ANALYTICS_CACHE_CONFIG,

  // Pagination defaults
  PAGINATION: ANALYTICS_PAGINATION,

  // Rate limiting
  RATE_LIMITS: ANALYTICS_RATE_LIMITS,

  // Time ranges
  TIME_RANGES: ANALYTICS_TIME_RANGES,

  // Field length limits
  FIELD_LIMITS: {
    EVENT_TYPE_MAX_LENGTH: 50,
    EVENT_CATEGORY_MAX_LENGTH: 50,
    SUBJECT_TYPE_MAX_LENGTH: 50,
    SUBJECT_ID_MAX_LENGTH: 255,
    SESSION_ID_MAX_LENGTH: 255,
    IP_ADDRESS_MAX_LENGTH: 45,
    USER_AGENT_MAX_LENGTH: 500,
  },

  // Database constraints
  DATABASE: {
    EVENT_DATA_COLUMN_TYPE: 'jsonb',
    METADATA_COLUMN_TYPE: 'jsonb',
  },
} as const;

// Type definitions for better TypeScript support
export type AnalyticsEventType =
  (typeof ANALYTICS_EVENT_TYPES)[keyof typeof ANALYTICS_EVENT_TYPES];

export type AnalyticsEventCategory =
  (typeof ANALYTICS_EVENT_CATEGORIES)[keyof typeof ANALYTICS_EVENT_CATEGORIES];

export type AnalyticsSubjectType =
  (typeof ANALYTICS_SUBJECT_TYPES)[keyof typeof ANALYTICS_SUBJECT_TYPES];

export type AnalyticsMetricType =
  (typeof ANALYTICS_METRIC_TYPES)[keyof typeof ANALYTICS_METRIC_TYPES];

export type AnalyticsTimeGranularity =
  (typeof ANALYTICS_TIME_GRANULARITY)[keyof typeof ANALYTICS_TIME_GRANULARITY];

export type AnalyticsTimeRange =
  (typeof ANALYTICS_TIME_RANGES)[keyof typeof ANALYTICS_TIME_RANGES];
