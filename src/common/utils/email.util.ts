/**
 * Email utility functions
 * Provides common email validation and formatting utilities
 */

/**
 * Mask email address for logging (security)
 * @param email - Email address to mask
 * @returns Masked email address
 *
 * @example
 * maskEmail('john.doe@example.com') // 'j***e@example.com'
 * maskEmail('ab@test.com') // '**@test.com'
 * maskEmail('invalid') // '***@***'
 */
export function maskEmail(email: string): string {
  if (!email?.includes('@')) {
    return '***@***';
  }

  const [localPart, domain] = email.split('@');
  const maskedLocal =
    localPart.length > 2
      ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`
      : '**';

  return `${maskedLocal}@${domain}`;
}

/**
 * Validate email format using regex
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Normalize email address (lowercase, trim)
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email.trim().toLowerCase();
}

/**
 * Extract domain from email address
 * @param email - Email address
 * @returns Domain part of email or empty string if invalid
 */
export function extractEmailDomain(email: string): string {
  if (!email?.includes('@')) {
    return '';
  }

  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

/**
 * Check if email is from a common provider
 * @param email - Email address to check
 * @returns true if from common provider, false otherwise
 */
export function isCommonEmailProvider(email: string): boolean {
  const domain = extractEmailDomain(email);
  const commonProviders = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
  ];

  return commonProviders.includes(domain);
}

/**
 * Generate email display name from email address
 * @param email - Email address
 * @returns Display name (e.g., "john.doe@example.com" -> "John Doe")
 */
export function generateDisplayNameFromEmail(email: string): string {
  if (!email?.includes('@')) {
    return email || 'Unknown';
  }

  const localPart = email.split('@')[0];

  // Replace dots and underscores with spaces
  const displayName = localPart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return displayName || 'Unknown';
}
