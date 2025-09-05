// Common Constants used across the application
export const COMMON_CONSTANTS = {
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // Date formats
  DATE_FORMATS: {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DATE_ONLY: 'YYYY-MM-DD',
    TIME_ONLY: 'HH:mm:ss',
    DISPLAY: 'DD/MM/YYYY',
  },

  // File upload
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
  },

  // Cache
  CACHE: {
    TTL: 3600, // 1 hour in seconds
    PREFIX: 'app:',
  },

  // Security
  SECURITY: {
    PASSWORD_MIN_LENGTH: 8,
    SESSION_TIMEOUT: 24 * 60 * 60, // 24 hours in seconds
  },

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    REMOVED: 'removed',
  },
} as const;

// Database related constants
export const DATABASE_CONSTANTS = {
  // Column types
  COLUMN_TYPES: {
    VARCHAR: 'varchar',
    TEXT: 'text',
    INTEGER: 'int',
    BIGINT: 'bigint',
    BOOLEAN: 'boolean',
    TIMESTAMP: 'timestamp',
    JSON: 'json',
    UUID: 'uuid',
  },

  // Index types
  INDEX_TYPES: {
    BTREE: 'btree',
    HASH: 'hash',
    GIN: 'gin',
  },

  // Cascade options
  CASCADE: {
    CASCADE: 'CASCADE',
    SET_NULL: 'SET NULL',
    RESTRICT: 'RESTRICT',
  },
} as const;
