import {
  calculateOffset,
  filterValidIds,
  generateCursor,
  generateNextCursor,
  getPaginationParams,
  isSameId,
  isValidId,
  numberIdsToStrings,
  numberToStringId,
  parseCursor,
  sortIds,
  stringIdsToNumbers,
  stringToNumberId,
  uniqueIds,
  validatePaginationLimit,
} from './id-utils';

describe('ID Utils', () => {
  describe('stringToNumberId', () => {
    it('should convert string ID to number', () => {
      expect(stringToNumberId('123')).toBe(123);
      expect(stringToNumberId('456789')).toBe(456789);
      expect(stringToNumberId('0')).toBe(0);
    });

    it('should handle large numbers', () => {
      const largeId = '9223372036854775807'; // Max safe integer
      expect(stringToNumberId(largeId)).toBe(9223372036854775807);
    });

    it('should throw error for invalid input', () => {
      expect(() => stringToNumberId('')).toThrow();
      expect(() => stringToNumberId('abc')).toThrow();
      expect(() => stringToNumberId('123.45')).toThrow();
      expect(() => stringToNumberId('-123')).toThrow();
    });
  });

  describe('numberToStringId', () => {
    it('should convert number ID to string', () => {
      expect(numberToStringId(123)).toBe('123');
      expect(numberToStringId(456789)).toBe('456789');
      expect(numberToStringId(0)).toBe('0');
    });

    it('should handle large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER; // 9007199254740991
      expect(numberToStringId(largeNumber)).toBe(largeNumber.toString());
    });
  });

  describe('isValidId', () => {
    it('should validate correct IDs', () => {
      expect(isValidId('123')).toBe(true);
      expect(isValidId('456789')).toBe(true);
      expect(isValidId('0')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('abc')).toBe(false);
      expect(isValidId('123.45')).toBe(false);
      expect(isValidId('-123')).toBe(false);
      expect(isValidId('123abc')).toBe(false);
    });
  });

  describe('stringIdsToNumbers', () => {
    it('should convert array of string IDs to numbers', () => {
      const stringIds = ['123', '456', '789'];
      const result = stringIdsToNumbers(stringIds);
      expect(result).toEqual([123, 456, 789]);
    });

    it('should handle empty array', () => {
      expect(stringIdsToNumbers([])).toEqual([]);
    });

    it('should throw error for invalid IDs', () => {
      expect(() => stringIdsToNumbers(['123', 'abc'])).toThrow();
    });
  });

  describe('numberIdsToStrings', () => {
    it('should convert array of number IDs to strings', () => {
      const numberIds = [123, 456, 789];
      const result = numberIdsToStrings(numberIds);
      expect(result).toEqual(['123', '456', '789']);
    });

    it('should handle empty array', () => {
      expect(numberIdsToStrings([])).toEqual([]);
    });
  });

  describe('generateCursor', () => {
    it('should generate cursor from ID and timestamp', () => {
      const id = '123';
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const cursor = generateCursor(id, timestamp);

      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
    });

    it('should generate cursor from ID only', () => {
      const id = '123';
      const cursor = generateCursor(id);

      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
    });
  });

  describe('parseCursor', () => {
    it('should parse valid cursor', () => {
      const id = '123';
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const cursor = generateCursor(id, timestamp);
      const parsed = parseCursor(cursor);

      expect(parsed).toEqual({
        id: '123',
        timestamp: timestamp,
      });
    });

    it('should return null for invalid cursor', () => {
      expect(parseCursor('invalid_cursor')).toBeNull();
      expect(parseCursor('')).toBeNull();
    });
  });

  describe('getPaginationParams', () => {
    it('should extract pagination parameters from cursor', () => {
      const id = '123';
      const timestamp = new Date('2024-01-01T00:00:00Z');
      const cursor = generateCursor(id, timestamp);
      const params = getPaginationParams(cursor, 20);

      expect(params).toMatchObject({
        startId: '123',
        startTimestamp: timestamp,
        limit: 20,
      });
    });

    it('should use default limit when not provided', () => {
      const id = '123';
      const cursor = generateCursor(id);
      const params = getPaginationParams(cursor);

      expect(params.limit).toBe(20);
    });

    it('should handle null cursor', () => {
      const params = getPaginationParams(undefined, 10);

      expect(params).toMatchObject({
        startId: null,
        startTimestamp: null,
        limit: 10,
      });
    });
  });

  describe('generateNextCursor', () => {
    it('should generate next cursor from last item', () => {
      const lastItem = {
        id: '123',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };
      const nextCursor = generateNextCursor(lastItem);

      expect(nextCursor).toBeDefined();
      expect(typeof nextCursor).toBe('string');
    });

    it('should generate cursor without timestamp', () => {
      const lastItem = { id: '123' };
      const nextCursor = generateNextCursor(lastItem);

      expect(nextCursor).toBeDefined();
    });

    it('should return null for invalid item', () => {
      expect(generateNextCursor(null as any)).toBeNull();
      expect(generateNextCursor({} as any)).toBeNull();
    });
  });

  describe('validatePaginationLimit', () => {
    it('should validate and clamp limit', () => {
      expect(validatePaginationLimit(10)).toBe(10);
      expect(validatePaginationLimit(50)).toBe(50);
      expect(validatePaginationLimit(100)).toBe(100);
    });

    it('should clamp limit to maximum', () => {
      expect(validatePaginationLimit(150)).toBe(100);
      expect(validatePaginationLimit(1000)).toBe(100);
    });

    it('should use default limit for undefined', () => {
      expect(validatePaginationLimit(undefined)).toBe(20);
    });

    it('should use custom max limit', () => {
      expect(validatePaginationLimit(50, 30)).toBe(30);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset from page and limit', () => {
      expect(calculateOffset(1, 10)).toBe(0);
      expect(calculateOffset(2, 10)).toBe(10);
      expect(calculateOffset(3, 20)).toBe(40);
    });

    it('should handle edge cases', () => {
      expect(calculateOffset(0, 10)).toBe(0);
      expect(calculateOffset(1, 0)).toBe(0);
    });
  });

  describe('isSameId', () => {
    it('should compare IDs correctly', () => {
      expect(isSameId('123', '123')).toBe(true);
      expect(isSameId('123', '456')).toBe(false);
      expect(isSameId('123', '0123')).toBe(false); // Different string representation
    });

    it('should handle edge cases', () => {
      expect(isSameId('', '')).toBe(true);
      expect(isSameId('', '123')).toBe(false);
      expect(isSameId('123', '')).toBe(false);
    });
  });

  describe('sortIds', () => {
    it('should sort IDs numerically', () => {
      const ids = ['10', '2', '1', '20'];
      const sorted = sortIds(ids);
      expect(sorted).toEqual(['1', '2', '10', '20']);
    });

    it('should handle empty array', () => {
      expect(sortIds([])).toEqual([]);
    });

    it('should handle single element', () => {
      expect(sortIds(['123'])).toEqual(['123']);
    });
  });

  describe('uniqueIds', () => {
    it('should remove duplicate IDs', () => {
      const ids = ['123', '456', '123', '789', '456'];
      const unique = uniqueIds(ids);
      expect(unique).toEqual(['123', '456', '789']);
    });

    it('should preserve order of first occurrence', () => {
      const ids = ['456', '123', '456', '789'];
      const unique = uniqueIds(ids);
      expect(unique).toEqual(['456', '123', '789']);
    });

    it('should handle empty array', () => {
      expect(uniqueIds([])).toEqual([]);
    });

    it('should handle single element', () => {
      expect(uniqueIds(['123'])).toEqual(['123']);
    });
  });

  describe('filterValidIds', () => {
    it('should filter valid IDs', () => {
      const ids = ['123', 'abc', '456', 'def', '789'];
      const valid = filterValidIds(ids);
      expect(valid).toEqual(['123', '456', '789']);
    });

    it('should handle empty array', () => {
      expect(filterValidIds([])).toEqual([]);
    });

    it('should handle all invalid IDs', () => {
      const ids = ['abc', 'def', 'ghi'];
      expect(filterValidIds(ids)).toEqual([]);
    });

    it('should handle all valid IDs', () => {
      const ids = ['123', '456', '789'];
      expect(filterValidIds(ids)).toEqual(['123', '456', '789']);
    });
  });
});
