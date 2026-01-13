/**
 * Key-Value Store Constants
 *
 * Defines constants for the key-value storage functionality
 * Provides flexible storage for various application data types
 */

// Content type hints for key-value pairs
export const CONTENT_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  JSON: 'json',
  XML: 'xml',
  HTML: 'html',
  MARKDOWN: 'markdown',
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

// Key-value status for lifecycle management
export const KEY_VALUE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  DELETED: 'deleted',
} as const;

export type KeyValueStatus =
  (typeof KEY_VALUE_STATUS)[keyof typeof KEY_VALUE_STATUS];

// Operation types for atomic operations
export const OPERATION_TYPES = {
  SET: 'set',
  GET: 'get',
  DELETE: 'delete',
  INCREMENT: 'increment',
  DECREMENT: 'decrement',
  EXISTS: 'exists',
} as const;

export type OperationType =
  (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

// Cache keys for key-value operations
export const CACHE_KEYS = {
  KEY_VALUE: 'key-value',
  KEY_VALUE_BY_KEY: 'key-value:key',
  KEY_VALUE_BY_NAMESPACE: 'key-value:namespace',
  KEY_VALUE_STATS: 'key-value:stats',
} as const;

// Main key-value constants
export const KEY_VALUE_CONSTANTS = {
  // Content types for value hints
  CONTENT_TYPES,

  // Status for lifecycle management
  STATUS: KEY_VALUE_STATUS,

  // Operation types
  OPERATION_TYPES,

  // Field length limits
  KEY_MAX_LENGTH: 255,
  NAMESPACE_MAX_LENGTH: 100,
  CONTENT_TYPE_MAX_LENGTH: 50,

  // TTL limits (in seconds)
  MIN_TTL_SECONDS: 60, // 1 minute minimum
  MAX_TTL_SECONDS: 2592000, // 30 days maximum
  DEFAULT_TTL_SECONDS: 86400, // 24 hours

  // Batch operation limits
  MAX_BATCH_SIZE: 100,
  MAX_KEYS_IN_GET_MULTIPLE: 50,

  // Pagination limits
  MAX_ITEMS_PER_PAGE: 100,
  DEFAULT_ITEMS_PER_PAGE: 20,

  // Cache configuration
  CACHE_KEYS,

  // Cache TTL (in seconds)
  CACHE_TTL: {
    KEY_VALUE: 3600, // 1 hour
    KEY_VALUE_BY_KEY: 1800, // 30 minutes
    KEY_VALUE_BY_NAMESPACE: 900, // 15 minutes
    KEY_VALUE_STATS: 300, // 5 minutes
  },

  // Stale-While-Revalidate TTL (in seconds)
  SWR_TTL: {
    KEY_VALUE: 300, // 5 minutes
    KEY_VALUE_BY_KEY: 150, // 2.5 minutes
    KEY_VALUE_BY_NAMESPACE: 120, // 2 minutes
  },

  // Cleanup job configuration
  CLEANUP_JOB: {
    INTERVAL_MINUTES: 60, // Run every hour
    BATCH_SIZE: 1000, // Process 1000 expired entries at a time
    MAX_PROCESS_TIME_MINUTES: 10, // Maximum processing time per run
  },

  // Pattern matching limits
  MAX_PATTERN_LENGTH: 100,
  PATTERN_CACHE_TTL: 600, // 10 minutes

  // Atomic operation limits
  MAX_INCREMENT_VALUE: 999999999,
  MIN_INCREMENT_VALUE: -999999999,
} as const;
