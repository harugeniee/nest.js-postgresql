/**
 * QR Module Constants - Comprehensive configuration and constants for the QR Actions feature
 * This file contains all constants used across the QR module including Redis keys, TTLs,
 * rate limits, deep link configuration, status messages, error messages, and more.
 */

/**
 * Redis key prefixes for different QR-related data types
 */
export const QR_REDIS_PREFIXES = {
  /** Prefix for QR tickets stored in Redis */
  TICKET: 'QR:TICKET:',
  /** Prefix for QR grants stored in Redis */
  GRANT: 'QR:GRANT:',
  /** Prefix for rate limiting keys */
  RATE_LIMIT: 'QR:RATE_LIMIT:',
} as const;

/**
 * Default TTL values in seconds for different QR components
 */
export const QR_TTL_DEFAULTS = {
  /** Default TTL for QR tickets (3 minutes) */
  TICKET: 180,
  /** Default TTL for QR grants (30 seconds) */
  GRANT: 30,
  /** Default TTL for rate limiting windows (1 minute) */
  RATE_LIMIT_WINDOW: 60,
} as const;

/**
 * Rate limiting configuration for QR endpoints
 */
export const QR_RATE_LIMITS = {
  /** Maximum number of tickets that can be created per IP per window */
  CREATE_TICKET: 10,
  /** Maximum number of grant exchanges per IP per window */
  EXCHANGE_GRANT: 5,
  /** Maximum number of scan attempts per ticket per user */
  SCAN_ATTEMPTS: 3,
  /** Maximum number of approval attempts per ticket per user */
  APPROVAL_ATTEMPTS: 3,
} as const;

/**
 * QR deep link configuration
 */
export const QR_DEEP_LINK_CONFIG = {
  /** Default scheme for app deep links */
  DEFAULT_SCHEME: 'app',
  /** Default path for QR handling */
  DEFAULT_PATH: 'qr',
  /** Default HTTPS fallback URL */
  DEFAULT_HTTPS_FALLBACK: 'https://example.com/qr/mobile/open',
  /** Default base URL for fallback links */
  DEFAULT_BASE_URL: 'https://example.com',
  /** Whether to use HTTPS fallback by default */
  DEFAULT_USE_HTTPS_FALLBACK: true,
} as const;

/**
 * QR status messages for different states
 */
export const QR_STATUS_MESSAGES = {
  PENDING: 'QR code is waiting to be scanned',
  SCANNED: 'QR code has been scanned, waiting for approval',
  APPROVED: 'Action has been approved, proceed with grant exchange',
  REJECTED: 'Action has been rejected by the user',
  EXPIRED: 'QR code has expired, please generate a new one',
  USED: 'QR code has been used and is no longer valid',
} as const;

/**
 * Error messages for QR operations
 */
export const QR_ERROR_MESSAGES = {
  TICKET_NOT_FOUND: 'QR ticket not found or has expired',
  TICKET_ALREADY_USED: 'QR ticket has already been used',
  TICKET_EXPIRED: 'QR ticket has expired',
  INVALID_CODE_VERIFIER: 'Invalid code verifier provided',
  INVALID_STATUS_TRANSITION: 'Invalid status transition for this ticket',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',
  UNAUTHORIZED_OPERATION: 'You are not authorized to perform this operation',
  ACTION_EXECUTION_FAILED: 'Failed to execute the requested action',
  INVALID_ACTION_TYPE: 'Invalid action type specified',
  MISSING_ACTION_IMPLEMENTATION: 'Action implementation not found',
  INVALID_TICKET_ID: 'Invalid ticket ID format',
  INVALID_CODE_CHALLENGE: 'Invalid code challenge format',
} as const;

/**
 * WebSocket event names for QR status updates
 */
export const QR_WS_EVENTS = {
  /** Event emitted when ticket status changes */
  STATUS_UPDATE: 'qr:status:update',
  /** Event emitted when a client joins a ticket room */
  JOIN_ROOM: 'qr:room:join',
  /** Event emitted when a client leaves a ticket room */
  LEAVE_ROOM: 'qr:room:leave',
  /** Event emitted when a ticket is scanned */
  TICKET_SCANNED: 'qr:ticket:scanned',
  /** Event emitted when a ticket is approved */
  TICKET_APPROVED: 'qr:ticket:approved',
  /** Event emitted when a ticket is rejected */
  TICKET_REJECTED: 'qr:ticket:rejected',
  /** Event emitted when a ticket expires */
  TICKET_EXPIRED: 'qr:ticket:expired',
} as const;

/**
 * QR room naming convention for WebSocket connections
 */
export const QR_ROOM_PREFIX = 'qr:ticket:';

/**
 * QR cryptographic configuration
 */
export const QR_CRYPTO_CONFIG = {
  /** Default length for code verifier (PKCE) */
  DEFAULT_CODE_VERIFIER_LENGTH: 64,
  /** Default length for grant tokens */
  DEFAULT_GRANT_TOKEN_LENGTH: 32,
  /** Default length for ticket IDs */
  DEFAULT_TICKET_ID_LENGTH: 16,
  /** Hash algorithm used for PKCE code challenge */
  HASH_ALGORITHM: 'sha256',
} as const;

/**
 * QR validation rules and limits
 */
export const QR_VALIDATION_RULES = {
  /** Minimum length for ticket IDs */
  MIN_TICKET_ID_LENGTH: 16,
  /** Maximum length for ticket IDs */
  MAX_TICKET_ID_LENGTH: 64,
  /** Minimum length for code verifiers */
  MIN_CODE_VERIFIER_LENGTH: 32,
  /** Maximum length for code verifiers */
  MAX_CODE_VERIFIER_LENGTH: 128,
  /** Maximum depth for payload sanitization */
  MAX_PAYLOAD_DEPTH: 2,
  /** Maximum string length in sanitized payloads */
  MAX_STRING_LENGTH: 100,
  /** Maximum array items in sanitized payloads */
  MAX_ARRAY_ITEMS: 10,
} as const;

/**
 * QR sensitive data patterns for sanitization
 */
export const QR_SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
  'userid',
  'user_id',
  'api_key',
  'private_key',
  'access_token',
  'refresh_token',
] as const;

/**
 * QR action type constants
 */
export const QR_ACTION_TYPES = {
  LOGIN: 'LOGIN',
  ADD_FRIEND: 'ADD_FRIEND',
  JOIN_ORG: 'JOIN_ORG',
  PAIR: 'PAIR',
} as const;

/**
 * QR ticket status constants
 */
export const QR_TICKET_STATUSES = {
  PENDING: 'PENDING',
  SCANNED: 'SCANNED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  USED: 'USED',
} as const;

/**
 * QR HTTP status codes for different scenarios
 */
export const QR_HTTP_STATUS_CODES = {
  /** Success - Ticket created successfully */
  TICKET_CREATED: 201,
  /** Success - Action executed successfully */
  ACTION_EXECUTED: 200,
  /** Bad Request - Invalid input data */
  BAD_REQUEST: 400,
  /** Unauthorized - Authentication required */
  UNAUTHORIZED: 401,
  /** Forbidden - Insufficient permissions */
  FORBIDDEN: 403,
  /** Not Found - Ticket or resource not found */
  NOT_FOUND: 404,
  /** Conflict - Ticket already used or expired */
  CONFLICT: 409,
  /** Too Many Requests - Rate limit exceeded */
  TOO_MANY_REQUESTS: 429,
  /** Internal Server Error - Action execution failed */
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * QR response messages for successful operations
 */
export const QR_SUCCESS_MESSAGES = {
  TICKET_CREATED: 'QR ticket created successfully',
  TICKET_SCANNED: 'QR ticket scanned successfully',
  TICKET_APPROVED: 'QR ticket approved successfully',
  TICKET_REJECTED: 'QR ticket rejected successfully',
  GRANT_EXCHANGED: 'Grant exchanged successfully',
  ACTION_EXECUTED: 'Action executed successfully',
} as const;

/**
 * QR logging constants
 */
export const QR_LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

/**
 * QR monitoring and metrics constants
 */
export const QR_METRICS = {
  /** Metric name for ticket creation */
  TICKET_CREATION: 'qr.ticket.creation',
  /** Metric name for ticket scanning */
  TICKET_SCANNING: 'qr.ticket.scanning',
  /** Metric name for ticket approval */
  TICKET_APPROVAL: 'qr.ticket.approval',
  /** Metric name for grant exchange */
  GRANT_EXCHANGE: 'qr.grant.exchange',
  /** Metric name for action execution */
  ACTION_EXECUTION: 'qr.action.execution',
  /** Metric name for WebSocket connections */
  WS_CONNECTIONS: 'qr.websocket.connections',
} as const;
