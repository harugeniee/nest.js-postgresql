/**
 * OTP (One-Time Password) utility functions
 * Provides common OTP generation and validation utilities
 */

import { globalSnowflake } from 'src/shared/libs/snowflake';

/**
 * Generate a random OTP code with specified length
 * @param length - Length of the OTP code (default: 6)
 * @returns OTP code as string with zero-padding
 */
export function generateOtpCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code.toString().padStart(length, '0');
}

/**
 * Generate a unique request ID for tracking
 * @param prefix - Prefix for the request ID (default: 'req')
 * @returns Unique request ID string
 */
export function generateRequestId(prefix: string = 'req'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate OTP-specific request ID
 * @returns OTP request ID with 'otp' prefix
 */
export function generateOtpRequestId(): string {
  return globalSnowflake.nextId().toString();
}

/**
 * Validate OTP code format
 * @param code - OTP code to validate
 * @param length - Expected length (default: 6)
 * @returns true if valid, false otherwise
 */
export function validateOtpCode(code: string, length: number = 6): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Check if code contains only digits
  if (!/^\d+$/.test(code)) {
    return false;
  }

  // Check length
  if (code.length !== length) {
    return false;
  }

  return true;
}

/**
 * Check if OTP code is expired
 * @param createdAt - Timestamp when OTP was created
 * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns true if expired, false otherwise
 */
export function isOtpExpired(
  createdAt: number,
  ttlSeconds: number = 300,
): boolean {
  const now = Date.now();
  const expiresAt = createdAt + ttlSeconds * 1000;
  return now > expiresAt;
}

/**
 * Calculate remaining time until OTP expires
 * @param createdAt - Timestamp when OTP was created
 * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 * @returns Remaining time in seconds (0 if expired)
 */
export function getOtpRemainingTime(
  createdAt: number,
  ttlSeconds: number = 300,
): number {
  const now = Date.now();
  const expiresAt = createdAt + ttlSeconds * 1000;
  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  return remaining;
}
