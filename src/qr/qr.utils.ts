import { createHash, randomBytes } from 'crypto';

/**
 * QR Utilities - Cryptographic and utility functions for the QR Actions feature
 * This module provides secure functions for PKCE, token generation, and deep link creation
 */

/**
 * Generates a cryptographically secure random string for use as a code verifier
 *
 * @param length - Length of the verifier string (default: 64)
 * @returns Base64url encoded random string
 */
export function generateCodeVerifier(length: number = 64): string {
  const randomBytesBuffer = randomBytes(length);
  return base64UrlEncode(randomBytesBuffer);
}

/**
 * Generates a PKCE code challenge from a code verifier
 * Uses SHA256 hashing as per RFC 7636
 *
 * @param codeVerifier - The code verifier string
 * @returns Base64url encoded SHA256 hash of the verifier
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256');
  hash.update(codeVerifier);
  const digest = hash.digest();
  return base64UrlEncode(digest);
}

/**
 * Verifies a PKCE code challenge against a code verifier
 *
 * @param codeVerifier - The code verifier string
 * @param codeChallenge - The code challenge string to verify against
 * @returns True if the challenge matches the verifier, false otherwise
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  const expectedChallenge = generateCodeChallenge(codeVerifier);
  return expectedChallenge === codeChallenge;
}

/**
 * Generates a cryptographically secure random token for grants
 *
 * @param length - Length of the token string (default: 32)
 * @returns Base64url encoded random string
 */
export function generateGrantToken(length: number = 32): string {
  const randomBytesBuffer = randomBytes(length);
  return base64UrlEncode(randomBytesBuffer);
}

/**
 * Generates a unique ticket ID
 *
 * @param length - Length of the ticket ID (default: 16)
 * @returns Base64url encoded random string
 */
export function generateTicketId(length: number = 16): string {
  const randomBytesBuffer = randomBytes(length);
  return base64UrlEncode(randomBytesBuffer);
}

/**
 * Encodes a buffer to base64url format (RFC 4648)
 * Replaces '+' with '-', '/' with '_', and removes padding '='
 *
 * @param buffer - Buffer to encode
 * @returns Base64url encoded string
 */
export function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes a base64url string to a buffer
 * Restores '+' and '/' characters and adds padding if needed
 *
 * @param str - Base64url encoded string
 * @returns Decoded buffer
 */
export function base64UrlDecode(str: string): Buffer {
  // Restore base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  return Buffer.from(base64, 'base64');
}

/**
 * Generates a deep link for QR codes
 *
 * @param ticketId - The ticket ID
 * @param codeChallenge - The PKCE code challenge
 * @param options - Deep link configuration options
 * @returns Deep link URL string
 */
export function generateDeepLink(
  ticketId: string,
  codeChallenge: string,
  options: {
    scheme?: string;
    baseUrl?: string;
    path?: string;
    useHttpsFallback?: boolean;
  } = {},
): string {
  const {
    scheme = 'app',
    baseUrl = 'https://example.com',
    path = 'qr',
    useHttpsFallback = true,
  } = options;

  // Create app deep link
  const appDeepLink = `${scheme}://${path}?tid=${encodeURIComponent(ticketId)}&cc=${encodeURIComponent(codeChallenge)}`;

  // If HTTPS fallback is enabled, create a fallback URL
  if (useHttpsFallback) {
    const httpsFallback = `${baseUrl}/${path}/mobile/open?tid=${encodeURIComponent(ticketId)}&cc=${encodeURIComponent(codeChallenge)}`;
    return `${appDeepLink}|${httpsFallback}`;
  }

  return appDeepLink;
}

/**
 * Parses a deep link to extract ticket information
 *
 * @param deepLink - The deep link string to parse
 * @returns Object containing ticket ID and code challenge, or null if invalid
 */
export function parseDeepLink(
  deepLink: string,
): { ticketId: string; codeChallenge: string } | null {
  try {
    // Handle both app:// and https:// formats
    let url: URL;

    if (deepLink.startsWith('app://')) {
      // For app:// links, we need to parse manually since they're not valid URLs
      const match = deepLink.match(/app:\/\/[^?]+\?tid=([^&]+)&cc=([^&]+)/);
      if (match) {
        return {
          ticketId: decodeURIComponent(match[1]),
          codeChallenge: decodeURIComponent(match[2]),
        };
      }
    } else {
      // For HTTPS links, use URL parsing
      url = new URL(deepLink);
      const ticketId = url.searchParams.get('tid');
      const codeChallenge = url.searchParams.get('cc');

      if (ticketId && codeChallenge) {
        return {
          ticketId: decodeURIComponent(ticketId),
          codeChallenge: decodeURIComponent(codeChallenge),
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validates a ticket ID format
 *
 * @param ticketId - The ticket ID to validate
 * @returns True if the ticket ID is valid, false otherwise
 */
export function isValidTicketId(ticketId: string): boolean {
  // Ticket ID should be base64url encoded and reasonable length
  return /^[A-Za-z0-9\-_]{16,64}$/.test(ticketId);
}

/**
 * Validates a code verifier format
 *
 * @param codeVerifier - The code verifier to validate
 * @returns True if the code verifier is valid, false otherwise
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  // Code verifier should be base64url encoded and reasonable length
  return /^[A-Za-z0-9\-_]{32,128}$/.test(codeVerifier);
}

/**
 * Sanitizes payload data for safe display in mobile UI
 * Removes sensitive information and limits data size
 *
 * @param payload - The original payload object
 * @param maxDepth - Maximum nesting depth (default: 2)
 * @returns Sanitized payload object
 */
export function sanitizePayload(
  payload: Record<string, any>,
  maxDepth: number = 2,
): Record<string, any> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'userid',
    'user_id',
  ];

  function sanitizeValue(
    value: any,
    depth: number,
  ):
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, any>
    | (string | number | boolean | Record<string, any>)[] {
    if (depth > maxDepth) {
      return '[Nested Object]';
    }

    if (value === null || value === undefined) {
      return value as null | undefined;
    }

    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 10)
        .map((item) => sanitizeValue(item, depth + 1)) as (
        | string
        | number
        | boolean
        | Record<string, any>
      )[];
    }

    if (typeof value === 'object') {
      const sanitizedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        // Skip sensitive keys
        if (
          sensitiveKeys.some((sensitive) =>
            key.toLowerCase().includes(sensitive),
          )
        ) {
          sanitizedObj[key] = '[Sensitive Data]';
        } else {
          sanitizedObj[key] = sanitizeValue(val, depth + 1);
        }
      }
      return sanitizedObj;
    }

    return '[Unknown Type]';
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      sanitized[key] = '[Sensitive Data]';
    } else {
      sanitized[key] = sanitizeValue(value, 1);
    }
  }

  return sanitized;
}
