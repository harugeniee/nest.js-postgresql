/**
 * Notification Constants
 * Defines all constants related to notifications
 */

// Notification types
export const NOTIFICATION_TYPES = {
  // Article related
  ARTICLE_PUBLISHED: 'article_published',
  ARTICLE_LIKED: 'article_liked',
  ARTICLE_BOOKMARKED: 'article_bookmarked',
  ARTICLE_COMMENTED: 'article_commented',
  ARTICLE_SHARED: 'article_shared',

  // Comment related
  COMMENT_LIKED: 'comment_liked',
  COMMENT_REPLIED: 'comment_replied',
  COMMENT_MENTIONED: 'comment_mentioned',

  // User related
  USER_FOLLOWED: 'user_followed',
  USER_MENTIONED: 'user_mentioned',

  // System related
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',

  // Security related
  LOGIN_ATTEMPT: 'login_attempt',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_VERIFIED: 'email_verified',

  // Content moderation
  CONTENT_REPORTED: 'content_reported',
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// Notification statuses
export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  READ: 'read',
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

// Notification priorities
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

// Notification channels
export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  PUSH: 'push',
  IN_APP: 'in_app',
  SMS: 'sms',
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

// Notification constants
export const NOTIFICATION_CONSTANTS = {
  // Field lengths
  TYPE_MAX_LENGTH: 50,
  TITLE_MAX_LENGTH: 200,
  MESSAGE_MAX_LENGTH: 1000,
  ACTION_URL_MAX_LENGTH: 500,
  EMAIL_TEMPLATE_MAX_LENGTH: 100,
  ERROR_MESSAGE_MAX_LENGTH: 1000,

  // Limits
  MAX_RETRIES: 3,
  BATCH_SIZE: 100,
  QUEUE_BATCH_SIZE: 50,

  // Timeouts (in milliseconds)
  SEND_TIMEOUT: 30000, // 30 seconds
  RETRY_DELAY: 5000, // 5 seconds
  BATCH_DELAY: 60000, // 1 minute

  // Cache settings
  CACHE: {
    TTL: 300, // 5 minutes
    PREFIX: 'notifications',
    SWR_SEC: 60, // 1 minute
  },

  // Email templates
  EMAIL_TEMPLATES: {
    COMMENT_NOTIFICATION: 'comment_notification',
    LIKE_NOTIFICATION: 'like_notification',
    MENTION_NOTIFICATION: 'mention_notification',
    ARTICLE_PUBLISHED: 'article_published',
    SYSTEM_ANNOUNCEMENT: 'system_announcement',
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
  },

  // Push notification settings
  PUSH: {
    TTL: 86400, // 24 hours
    PRIORITY: 'high',
    SOUND: 'default',
  },

  // Batch processing
  BATCH: {
    EMAIL_FREQUENCY: 15, // minutes
    PUSH_FREQUENCY: 5, // minutes
    IN_APP_FREQUENCY: 1, // minute
  },

  // Rate limiting
  RATE_LIMIT: {
    EMAIL_PER_HOUR: 10,
    PUSH_PER_HOUR: 50,
    IN_APP_PER_HOUR: 100,
  },

  // Notification types
  TYPES: NOTIFICATION_TYPES,
  STATUS: NOTIFICATION_STATUS,
  PRIORITY: NOTIFICATION_PRIORITY,
  CHANNEL: NOTIFICATION_CHANNEL,
} as const;

// Notification job names for RabbitMQ
export const NOTIFICATION_JOB_NAMES = {
  SEND_EMAIL: 'notification.send_email',
  SEND_PUSH: 'notification.send_push',
  SEND_IN_APP: 'notification.send_in_app',
  SEND_SMS: 'notification.send_sms',
  BATCH_EMAIL: 'notification.batch_email',
  BATCH_PUSH: 'notification.batch_push',
  RETRY_FAILED: 'notification.retry_failed',
  CLEANUP_OLD: 'notification.cleanup_old',
} as const;

// Notification event types
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  SENT: 'notification.sent',
  DELIVERED: 'notification.delivered',
  FAILED: 'notification.failed',
  READ: 'notification.read',
  BATCHED: 'notification.batched',
} as const;
