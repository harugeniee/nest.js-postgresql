/**
 * QR Action Types - Defines the different types of actions that can be performed via QR codes
 */
export enum QrActionType {
  LOGIN = 'LOGIN',
  ADD_FRIEND = 'ADD_FRIEND',
  JOIN_ORG = 'JOIN_ORG',
  PAIR = 'PAIR',
}

/**
 * QR Ticket Status - Represents the current state of a QR ticket in its lifecycle
 */
export type QrTicketStatus =
  | 'PENDING'
  | 'SCANNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'USED';

/**
 * QR Ticket Interface - Represents a QR ticket with all its properties and metadata
 */
export interface QrTicket {
  /** Unique identifier for the ticket */
  tid: string;
  /** Type of action this ticket represents */
  type: QrActionType;
  /** Current status of the ticket */
  status: QrTicketStatus;
  /** PKCE code challenge (base64url encoded SHA256 hash of code verifier) */
  codeChallenge: string;
  /** Optional web session identifier to bind the ticket to a specific browser session */
  webSessionId?: string;
  /** Additional data specific to the action type */
  payload?: Record<string, any>;
  /** User ID who created the ticket (if applicable) */
  createdBy?: string;
  /** User ID who scanned the QR code */
  scannedBy?: string;
  /** User ID who approved the action */
  approvedBy?: string;
  /** Timestamp when the ticket was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Timestamp when the QR was scanned (Unix timestamp in milliseconds) */
  scannedAt?: number;
  /** Timestamp when the action was approved (Unix timestamp in milliseconds) */
  approvedAt?: number;
  /** Timestamp when the ticket expires (Unix timestamp in milliseconds) */
  expiresAt: number;
}

/**
 * QR Grant Interface - Represents a short-lived grant token for exchanging QR approval to JWT
 */
export interface QrGrant {
  /** The ticket ID this grant is associated with */
  tid: string;
  /** Type of action that was approved */
  type: QrActionType;
  /** Web session ID that requested the action */
  webSessionId?: string;
  /** User ID who approved the action */
  userId: string;
  /** Timestamp when the grant was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Timestamp when the grant expires (Unix timestamp in milliseconds) */
  expiresAt: number;
}

/**
 * QR Ticket Preview - Safe preview data returned to mobile clients (no sensitive information)
 */
export interface QrTicketPreview {
  /** Type of action this ticket represents */
  type: QrActionType;
  /** Safe preview of payload data (sanitized) */
  payloadPreview?: Record<string, any>;
  /** Current status of the ticket */
  status: QrTicketStatus;
  /** Whether the ticket is expired */
  isExpired: boolean;
}

/**
 * QR Status Event - WebSocket event payload for status updates
 */
export interface QrStatusEvent {
  /** The ticket ID this status update is for */
  tid: string;
  /** New status of the ticket */
  status: QrTicketStatus;
  /** Optional message describing the status change */
  message?: string;
  /** Timestamp of the status change (Unix timestamp in milliseconds) */
  timestamp: number;
}

/**
 * QR Deep Link Options - Configuration for generating deep links
 */
export interface QrDeepLinkOptions {
  /** Base URL for the deep link */
  baseUrl?: string;
  /** Custom scheme for app deep links */
  scheme?: string;
  /** Whether to use HTTPS fallback if app is not installed */
  useHttpsFallback?: boolean;
  /** Custom path for the QR handler */
  path?: string;
}
