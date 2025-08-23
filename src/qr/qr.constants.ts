/**
 * QR Module Constants - Configuration and Redis key prefixes for the QR Actions feature
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
} as const;

/**
 * QR room naming convention for WebSocket connections
 */
export const QR_ROOM_PREFIX = 'qr:ticket:';
