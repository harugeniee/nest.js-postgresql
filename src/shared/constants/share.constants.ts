/**
 * Share system constants
 */

export const SHARE_CONSTANTS = {
  /**
   * Supported content types for sharing
   */
  CONTENT_TYPES: {
    ARTICLE: 'article',
    USER: 'user',
    MEDIA: 'media',
    COMMENT: 'comment',
    BOOKMARK_FOLDER: 'bookmark_folder',
    STICKER_PACK: 'sticker_pack',
    QR_TICKET: 'qr_ticket',
  } as const,

  /**
   * Share link code generation
   */
  CODE: {
    LENGTH: 8,
    MAX_ATTEMPTS: 10,
  },

  /**
   * Session configuration
   */
  SESSION: {
    EXPIRES_DAYS: 7,
    TOKEN_LENGTH: 64,
  },

  /**
   * Attribution configuration
   */
  ATTRIBUTION: {
    WINDOW_DAYS: 7,
  },

  /**
   * Data retention policies
   */
  RETENTION: {
    CLICKS_DAYS: 90,
    ATTRIBUTIONS_DAYS: 30,
    CONVERSIONS_DAYS: 90,
    AGGREGATIONS_YEARS: 1,
  },

  /**
   * Cache configuration
   */
  CACHE: {
    SHARE_LINKS_TTL_SEC: 300,
    METRICS_TTL_SEC: 60,
    SWR_SEC: 30,
  },

  /**
   * Conversion types
   */
  CONVERSION_TYPES: {
    SUBSCRIBE: 'subscribe',
    COMMENT: 'comment',
    FOLLOW_AUTHOR: 'follow_author',
    LIKE: 'like',
    BOOKMARK: 'bookmark',
    PURCHASE: 'purchase',
    SIGNUP: 'signup',
    DOWNLOAD: 'download',
    VIEW: 'view',
  } as const,

  /**
   * Default channels
   */
  DEFAULT_CHANNELS: {
    TWITTER: 'twitter',
    FACEBOOK: 'facebook',
    LINKEDIN: 'linkedin',
    EMAIL: 'email',
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    COPY_LINK: 'copy_link',
    EMBED: 'embed',
  } as const,
} as const;

export type ShareContentType =
  (typeof SHARE_CONSTANTS.CONTENT_TYPES)[keyof typeof SHARE_CONSTANTS.CONTENT_TYPES];
export type ShareConversionType =
  (typeof SHARE_CONSTANTS.CONVERSION_TYPES)[keyof typeof SHARE_CONSTANTS.CONVERSION_TYPES];
export type ShareChannelType =
  (typeof SHARE_CONSTANTS.DEFAULT_CHANNELS)[keyof typeof SHARE_CONSTANTS.DEFAULT_CHANNELS];
