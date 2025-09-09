/**
 * OTP data structure stored in cache/database
 */
export interface OtpData {
  /** The OTP code (6 digits) */
  code: string;
  /** Email address the OTP was sent to */
  email: string;
  /** Timestamp when OTP was created */
  createdAt: number;
  /** Timestamp when OTP expires */
  expiresAt: number;
  /** Number of verification attempts made */
  attempts: number;
  /** Maximum number of attempts allowed */
  maxAttempts: number;
  /** Whether the OTP has been used/verified */
  isUsed: boolean;
  /** Request ID for tracking */
  requestId: string;
}

/**
 * OTP request result
 */
export interface OtpRequestResult {
  /** Unique request ID for tracking */
  requestId: string;
  /** Time in seconds until OTP expires */
  expiresInSec: number;
  /** Whether the request was successful */
  success: boolean;
  /** Error message if request failed */
  error?: string;
}

/**
 * OTP verification result
 */
export interface OtpVerifyResult {
  /** Whether verification was successful */
  success: boolean;
  /** Error message if verification failed */
  error?: string;
  /** Remaining attempts if verification failed */
  remainingAttempts?: number;
  /** Time until OTP expires if verification failed */
  expiresInSec?: number;
}

/**
 * OTP store interface for managing OTP data
 */
export interface OtpStore {
  /**
   * Store OTP data with TTL
   * @param key - Unique key for the OTP (usually email-based)
   * @param data - OTP data to store
   * @param ttlInSec - Time to live in seconds
   */
  set(key: string, data: OtpData, ttlInSec: number): Promise<void>;

  /**
   * Retrieve OTP data by key
   * @param key - Unique key for the OTP
   * @returns OTP data or null if not found/expired
   */
  get(key: string): Promise<OtpData | null>;

  /**
   * Delete OTP data by key
   * @param key - Unique key for the OTP
   */
  delete(key: string): Promise<void>;

  /**
   * Increment attempt count for an OTP
   * @param key - Unique key for the OTP
   * @returns Updated OTP data or null if not found
   */
  incrementAttempts(key: string): Promise<OtpData | null>;

  /**
   * Mark OTP as used and delete it
   * @param key - Unique key for the OTP
   * @returns Whether the operation was successful
   */
  markAsUsed(key: string): Promise<boolean>;
}

/**
 * Email OTP sender interface
 */
export interface EmailOtpSender {
  /**
   * Send OTP code via email
   * @param email - Recipient email address
   * @param code - OTP code to send
   * @param requestId - Request ID for tracking
   * @returns Promise that resolves when email is sent
   */
  sendOtp(email: string, code: string, requestId: string): Promise<void>;
}
