// Sticker Entity Constants
export const STICKER_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 100,
  TAGS_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 100,
  PACK_NAME_MAX_LENGTH: 100,
  PACK_SLUG_MAX_LENGTH: 120,
  PACK_DESCRIPTION_MAX_LENGTH: 255,

  // File size limits (in bytes) - Stickers are smaller than regular media
  SIZE_LIMITS: {
    MAX: 512 * 1024, // 512KB as per Discord-like constraints
    RECOMMENDED_SIDE: 320, // Recommended 320x320 pixels
    MAX_SIDE: 1024, // Maximum 1024x1024 pixels
    MAX_DURATION_MS: 5000, // 5 seconds for animated stickers
  },

  // Sticker formats
  FORMATS: {
    PNG: 'png',
    APNG: 'apng',
    GIF: 'gif',
    LOTTIE: 'lottie',
  },

  // Sticker status
  STATUS: {
    DRAFT: 'draft',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  // Allowed MIME types for stickers
  ALLOWED_MIME_TYPES: {
    PNG: ['image/png'],
    APNG: ['image/apng'],
    GIF: ['image/gif'],
    LOTTIE: ['application/json'],
  },

  // Sticker pack status
  PACK_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Cache settings
  CACHE: {
    TTL: 300, // 5 minutes
    PREFIX: 'sticker',
  },

  // Message codes for error handling
  MESSAGE_CODE: {
    STICKER_NOT_FOUND: 'STICKER_NOT_FOUND',
    STICKER_PACK_NOT_FOUND: 'STICKER_PACK_NOT_FOUND',
    STICKER_FORMAT_NOT_SUPPORTED: 'STICKER_FORMAT_NOT_SUPPORTED',
    STICKER_SIZE_EXCEEDED: 'STICKER_SIZE_EXCEEDED',
    STICKER_UPLOAD_FAILED: 'STICKER_UPLOAD_FAILED',
    STICKER_DELETE_FAILED: 'STICKER_DELETE_FAILED',
    STICKER_PACK_ITEM_EXISTS: 'STICKER_PACK_ITEM_EXISTS',
    STICKER_PACK_ITEM_NOT_FOUND: 'STICKER_PACK_ITEM_NOT_FOUND',
    STICKER_NOT_AVAILABLE: 'STICKER_NOT_AVAILABLE',
    STICKER_PACK_NOT_PUBLISHED: 'STICKER_PACK_NOT_PUBLISHED',
  },
} as const;

// Type definitions for better TypeScript support
export type StickerFormat =
  (typeof STICKER_CONSTANTS.FORMATS)[keyof typeof STICKER_CONSTANTS.FORMATS];
export type StickerStatus =
  (typeof STICKER_CONSTANTS.STATUS)[keyof typeof STICKER_CONSTANTS.STATUS];
export type StickerPackStatus =
  (typeof STICKER_CONSTANTS.PACK_STATUS)[keyof typeof STICKER_CONSTANTS.PACK_STATUS];
export type StickerSizeLimit =
  (typeof STICKER_CONSTANTS.SIZE_LIMITS)[keyof typeof STICKER_CONSTANTS.SIZE_LIMITS];
