/**
 * ID Utilities for Follow System
 *
 * Provides utilities for converting between different ID formats
 * and handling ID validation for bitset operations
 */

/**
 * Convert string ID to number for bitset operations
 * @param id String ID (bigint as string)
 * @returns Number ID for bitset
 */
export function stringToNumberId(id: string): number {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId < 0) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return numId;
}

/**
 * Convert number ID back to string
 * @param id Number ID from bitset
 * @returns String ID
 */
export function numberToStringId(id: number): string {
  return id.toString();
}

/**
 * Validate ID format
 * @param id ID to validate
 * @returns True if valid
 */
export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId >= 0;
}

/**
 * Convert array of string IDs to number array
 * @param ids Array of string IDs
 * @returns Array of number IDs
 */
export function stringIdsToNumbers(ids: string[]): number[] {
  return ids.map(stringToNumberId);
}

/**
 * Convert array of number IDs to string array
 * @param ids Array of number IDs
 * @returns Array of string IDs
 */
export function numberIdsToStrings(ids: number[]): string[] {
  return ids.map(numberToStringId);
}

/**
 * Generate cursor for pagination
 * @param id Last ID in current page
 * @param timestamp Optional timestamp for cursor
 * @returns Base64 encoded cursor
 */
export function generateCursor(id: string, timestamp?: Date): string {
  const cursorData = {
    id,
    timestamp: timestamp || new Date(),
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Parse cursor for pagination
 * @param cursor Base64 encoded cursor
 * @returns Parsed cursor data
 */
export function parseCursor(
  cursor: string,
): { id: string; timestamp: Date } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    return {
      id: parsed.id,
      timestamp: new Date(parsed.timestamp),
    };
  } catch {
    return null;
  }
}

/**
 * Generate pagination parameters for database queries
 * @param cursor Optional cursor
 * @param limit Page size
 * @returns Pagination parameters
 */
export function getPaginationParams(cursor?: string, limit: number = 20) {
  if (cursor) {
    const parsed = parseCursor(cursor);
    if (parsed) {
      return {
        afterId: parsed.id,
        afterTimestamp: parsed.timestamp,
        limit,
      };
    }
  }

  return {
    limit,
  };
}

/**
 * Generate next cursor for pagination
 * @param lastItem Last item in current page
 * @param timestamp Optional timestamp
 * @returns Next cursor or null if no more items
 */
export function generateNextCursor(
  lastItem: { id: string; createdAt?: Date },
  timestamp?: Date,
): string | null {
  if (!lastItem) return null;
  return generateCursor(lastItem.id, timestamp || lastItem.createdAt);
}

/**
 * Validate pagination parameters
 * @param limit Page size
 * @param maxLimit Maximum allowed page size
 * @returns Validated limit
 */
export function validatePaginationLimit(
  limit?: number,
  maxLimit: number = 100,
): number {
  if (!limit || limit < 1) return 20;
  if (limit > maxLimit) return maxLimit;
  return limit;
}

/**
 * Calculate offset for database queries
 * @param page Page number (1-based)
 * @param limit Page size
 * @returns Offset value
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Check if two IDs are the same
 * @param id1 First ID
 * @param id2 Second ID
 * @returns True if same
 */
export function isSameId(id1: string, id2: string): boolean {
  return id1 === id2;
}

/**
 * Sort IDs numerically
 * @param ids Array of string IDs
 * @returns Sorted array of string IDs
 */
export function sortIds(ids: string[]): string[] {
  return ids.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
}

/**
 * Remove duplicate IDs
 * @param ids Array of string IDs
 * @returns Array of unique string IDs
 */
export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Filter valid IDs
 * @param ids Array of string IDs
 * @returns Array of valid string IDs
 */
export function filterValidIds(ids: string[]): string[] {
  return ids.filter(isValidId);
}
