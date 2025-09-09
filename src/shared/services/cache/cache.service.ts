import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

/**
 * CacheOptions defines cache configuration for consumers of CacheService
 * @interface CacheOptions
 * @property {boolean} enabled - Toggle caching behavior on/off
 * @property {number} ttlSec - Default time-to-live in seconds for cached items
 * @property {string} [prefix] - Optional key namespace prefix for organizing cache keys
 * @property {number} [swrSec] - Optional stale-while-revalidate window in seconds
 */
export interface CacheOptions {
  enabled: boolean;
  ttlSec: number;
  prefix?: string;
  swrSec?: number;
}

/**
 * CacheService provides Redis-based caching functionality with advanced features
 * including distributed locks, atomic operations, and pattern-based key management.
 *
 * Features:
 * - Basic CRUD operations (get, set, delete)
 * - Pattern-based key operations using SCAN
 * - Distributed locking mechanism
 * - Atomic operations using Lua scripts
 * - Rate limiting with atomic increments
 * - Cache-aside pattern implementation
 *
 * @class CacheService
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = 3600; // 1 hour in seconds

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Lifecycle hook called when the module is initialized
   * Sets up Redis event listeners and monitoring
   */
  onModuleInit(): void {
    this.setupRedisEventListeners();
  }

  /**
   * Lifecycle hook called when the module is destroyed
   * Gracefully closes Redis connection
   */
  onModuleDestroy(): void {
    void this.redis.quit();
    void this.clearCache();
  }

  /**
   * Setup Redis event listeners for logging and monitoring
   * Configures connection events, command events, and monitoring mode
   * @private
   */
  private setupRedisEventListeners(): void {
    // Connection events
    this.redis.on('connect', () => {
      this.logger.log('🟢 Redis connected');
    });

    this.redis.on('ready', () => {
      this.logger.log('✅ Redis ready');
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error('❌ Redis error:', error);
    });

    this.redis.on('close', () => {
      this.logger.log('🔴 Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('🔄 Redis reconnecting...');
    });

    // Command events
    this.redis.on('command', (command: string[]) => {
      this.logger.debug(`📤 Redis command sent: ${command.join(' ')}`);
    });

    // Start monitoring in development mode
    if (process.env.NODE_ENV === 'development') {
      void this.startMonitoring();
    }
  }

  /**
   * Start Redis monitoring mode to log all commands (development only)
   * Enables real-time command logging for debugging purposes
   * @private
   * @returns {Promise<void>}
   */
  private async startMonitoring(): Promise<void> {
    try {
      await this.redis.monitor();

      this.redis.on(
        'monitor',
        (time: number, args: string[], source: string, database: number) => {
          const timestamp = new Date(time * 1000).toISOString();
          this.logger.debug(
            `🔍 [${timestamp}] Redis ${source} DB${database}: ${args.join(' ')}`,
          );
        },
      );

      this.logger.log('📊 Redis monitoring started');
    } catch (error) {
      this.logger.error('❌ Failed to start Redis monitoring:', error);
    }
  }

  /**
   * Get Redis server information and statistics
   * @returns {Promise<string>} Redis server information string
   * @throws {Error} When Redis info command fails
   */
  async getRedisInfo(): Promise<string> {
    try {
      const info = await this.redis.info();
      this.logger.debug('Redis info retrieved');
      return info;
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      throw error;
    }
  }

  /**
   * Clear all cache entries from Redis (use with caution in production)
   * Removes all keys from all databases
   * @returns {Promise<void>}
   * @throws {Error} When Redis flushall command fails
   */
  async clearCache(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.log('🧹 Redis cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get Time-To-Live (TTL) for a specific cache key
   * @param {string} key - The cache key to check TTL for
   * @returns {Promise<number>} TTL in seconds, -1 if key has no TTL, -2 if key doesn't exist
   * @throws {Error} When Redis TTL command fails
   */
  async getTtl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set cache with key and value, optionally with TTL
   * @param {string} key - The cache key to store the value under
   * @param {unknown} value - The value to cache (will be JSON serialized)
   * @param {number} [ttlInSec] - Optional TTL in seconds. If not provided, uses default TTL. If negative, no TTL is set
   * @returns {Promise<void>}
   * @throws {Error} When Redis set/setex command fails
   */
  async set(key: string, value: unknown, ttlInSec?: number): Promise<void> {
    try {
      const ttl = ttlInSec ?? this.defaultTtl;
      const serializedValue = JSON.stringify(value);

      this.logger.debug(`💾 Setting cache key: ${key}, TTL: ${ttl}s`);

      if (ttl >= 0) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache value by key
   * @template T - The expected type of the cached value
   * @param {string} key - The cache key to retrieve
   * @returns {Promise<T | null>} The cached value if found, null if not found
   * @throws {Error} When Redis get command fails
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.logger.debug(`🔍 Getting cache key: ${key}`);
      const value = await this.redis.get(key);

      if (!value) {
        this.logger.debug(`❌ Cache miss for key: ${key}`);
        return null;
      }

      this.logger.debug(`✅ Cache hit for key: ${key}`);
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete cache entry by key
   * @param {string} key - The cache key to delete
   * @returns {Promise<void>}
   * @throws {Error} When Redis del command fails
   */
  async delete(key: string): Promise<void> {
    try {
      this.logger.debug(`🗑️ Deleting cache key: ${key}`);
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a cache key exists
   * @param {string} key - The cache key to check
   * @returns {Promise<boolean>} True if key exists, false otherwise
   * @throws {Error} When Redis exists command fails
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set cache with prefix for better key organization
   * @param {string} prefix - The prefix to prepend to the key
   * @param {string} key - The cache key (will be combined with prefix)
   * @param {unknown} value - The value to cache
   * @param {number} [ttl] - Optional TTL in seconds
   * @returns {Promise<void>}
   */
  async setWithPrefix(
    prefix: string,
    key: string,
    value: unknown,
    ttl?: number,
  ): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.set(fullKey, value, ttl);
  }

  /**
   * Get cache with prefix
   * @template T - The expected type of the cached value
   * @param {string} prefix - The prefix used when setting the cache
   * @param {string} key - The cache key (will be combined with prefix)
   * @returns {Promise<T | null>} The cached value if found, null if not found
   */
  async getWithPrefix<T>(prefix: string, key: string): Promise<T | null> {
    const fullKey = `${prefix}:${key}`;
    return this.get<T>(fullKey);
  }

  /**
   * Delete cache with prefix
   * @param {string} prefix - The prefix used when setting the cache
   * @param {string} key - The cache key (will be combined with prefix)
   * @returns {Promise<void>}
   */
  async deleteWithPrefix(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.delete(fullKey);
  }

  /**
   * Clear cache by pattern using SCAN (safe for production)
   * Uses Redis SCAN command to safely iterate through keys matching a pattern
   * @param {string} pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*', '*:profile')
   * @param {number} [count=100] - Number of keys to scan per iteration (higher values = faster but more memory usage)
   * @returns {Promise<number>} Total number of keys deleted
   * @throws {Error} When Redis scan or del commands fail
   */
  async deleteKeysByPattern(pattern: string, count = 100): Promise<number> {
    try {
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count,
        );
        cursor = parseInt(result[0], 10);
        const keys = result[1];

        if (keys.length > 0) {
          await this.redis.del(...keys);
          deletedCount += keys.length;
          this.logger.debug(
            `🗑️ Deleted ${keys.length} keys matching pattern: ${pattern}`,
          );
        }
      } while (cursor !== 0);

      this.logger.log(
        `✅ Total deleted: ${deletedCount} keys for pattern: ${pattern}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete keys by pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Delete keys by pattern using SCAN with UNLINK (non-blocking, Redis 4.0+)
   * Uses Redis UNLINK command for non-blocking deletion, better for production environments
   * @param {string} pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*', '*:profile')
   * @param {number} [count=100] - Number of keys to scan per iteration
   * @returns {Promise<number>} Total number of keys unlinked
   * @throws {Error} When Redis scan or unlink commands fail
   */
  async deleteKeysByPatternAsync(
    pattern: string,
    count = 100,
  ): Promise<number> {
    try {
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count,
        );
        cursor = parseInt(result[0], 10);
        const keys = result[1];

        if (keys.length > 0) {
          await this.redis.unlink(...keys); // Non-blocking delete
          deletedCount += keys.length;
          this.logger.debug(
            `🗑️ Unlinked ${keys.length} keys matching pattern: ${pattern}`,
          );
        }
      } while (cursor !== 0);

      this.logger.log(
        `✅ Total unlinked: ${deletedCount} keys for pattern: ${pattern}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to unlink keys by pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Find keys by pattern using SCAN (safe for production)
   * Returns all keys matching the pattern without deleting them
   * @param {string} pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*', '*:profile')
   * @param {number} [count=100] - Number of keys to scan per iteration
   * @returns {Promise<string[]>} Array of keys matching the pattern
   * @throws {Error} When Redis scan command fails
   */
  async findKeysByPattern(pattern: string, count = 100): Promise<string[]> {
    try {
      let cursor = 0;
      const keys: string[] = [];

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count,
        );
        cursor = parseInt(result[0], 10);
        const foundKeys = result[1];

        keys.push(...foundKeys);
      } while (cursor !== 0);

      this.logger.debug(
        `🔍 Found ${keys.length} keys matching pattern: ${pattern}`,
      );
      return keys;
    } catch (error) {
      this.logger.error(`Failed to find keys by pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Count keys by pattern using SCAN (safe for production)
   * Returns the total count of keys matching the pattern without retrieving them
   * @param {string} pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*', '*:profile')
   * @param {number} [count=100] - Number of keys to scan per iteration
   * @returns {Promise<number>} Total count of keys matching the pattern
   * @throws {Error} When Redis scan command fails
   */
  async countKeysByPattern(pattern: string, count = 100): Promise<number> {
    try {
      let cursor = 0;
      let totalCount = 0;

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count,
        );
        cursor = parseInt(result[0], 10);
        const keys = result[1];

        totalCount += keys.length;
      } while (cursor !== 0);

      this.logger.debug(
        `📊 Found ${totalCount} keys matching pattern: ${pattern}`,
      );
      return totalCount;
    } catch (error) {
      this.logger.error(`Failed to count keys by pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys by multiple patterns
   * Processes each pattern sequentially and returns results for each
   * @param {string[]} patterns - Array of Redis patterns to match
   * @param {number} [count=100] - Number of keys to scan per iteration for each pattern
   * @returns {Promise<Record<string, number>>} Object mapping each pattern to the number of keys deleted
   * @throws {Error} When any Redis operation fails
   */
  async deleteKeysByPatterns(
    patterns: string[],
    count = 100,
  ): Promise<Record<string, number>> {
    try {
      const results: Record<string, number> = {};

      for (const pattern of patterns) {
        const deletedCount = await this.deleteKeysByPattern(pattern, count);
        results[pattern] = deletedCount;
      }

      this.logger.log(`✅ Deleted keys by patterns:`, results);
      return results;
    } catch (error) {
      this.logger.error('Failed to delete keys by patterns:', error);
      throw error;
    }
  }

  /**
   * Delete keys by prefix (convenience method)
   * Shorthand for deleting keys that start with a specific prefix
   * @param {string} prefix - Key prefix (e.g., 'ABC:NBN:12')
   * @param {number} [count=100] - Number of keys to scan per iteration
   * @returns {Promise<number>} Total number of keys deleted
   */
  async deleteKeysByPrefix(prefix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`${prefix}*`, count);
  }

  /**
   * Delete keys by suffix (convenience method)
   * Shorthand for deleting keys that end with a specific suffix
   * @param {string} suffix - Key suffix (e.g., ':123')
   * @param {number} [count=100] - Number of keys to scan per iteration
   * @returns {Promise<number>} Total number of keys deleted
   */
  async deleteKeysBySuffix(suffix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`*${suffix}`, count);
  }

  /**
   * Reset all cache entries
   * Removes all keys from all databases (use with extreme caution in production)
   * @returns {Promise<void>}
   * @throws {Error} When Redis flushall command fails
   */
  async reset(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.log('🧹 Redis cache reset');
    } catch (error) {
      this.logger.error('Failed to reset cache:', error);
      throw error;
    }
  }

  /**
   * Set distributed lock with TTL
   * Implements a simple distributed locking mechanism using Redis
   * @param {string} identifier - Unique identifier for the lock
   * @param {number} ttl - Lock TTL in seconds (lock will auto-expire after this time)
   * @returns {Promise<boolean>} True if lock was acquired, false if already locked
   * @throws {Error} When Redis operations fail
   */
  async setLock(identifier: string, ttl: number): Promise<boolean> {
    try {
      const key = `lock:${identifier}`;
      const lock = await this.redis.get(key);
      if (lock) {
        return false; // Already locked
      } else {
        await this.redis.setex(key, ttl, 'true');
        return true; // Lock acquired
      }
    } catch (error) {
      this.logger.error(`Failed to set lock for ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Release distributed lock
   * Removes the lock, allowing other processes to acquire it
   * @param {string} identifier - Unique identifier for the lock to release
   * @returns {Promise<void>}
   * @throws {Error} When Redis del command fails
   */
  async releaseLock(identifier: string): Promise<void> {
    try {
      const key = `lock:${identifier}`;
      await this.redis.del(key);
      this.logger.debug(`🔓 Lock released for: ${identifier}`);
    } catch (error) {
      this.logger.error(`Failed to release lock for ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Remember pattern (Cache-Aside pattern)
   * Gets value from cache if exists, otherwise calls factory function and caches the result
   * @template T - The type of value to cache
   * @param {string} key - Cache key to store/retrieve the value
   * @param {() => Promise<T>} factory - Function to generate value if not cached
   * @param {number} [ttlInSec] - Optional TTL override for the cached value
   * @returns {Promise<T | null>} The cached or generated value, null if factory fails
   */
  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    ttlInSec?: number,
  ): Promise<T | null> {
    try {
      const existing = await this.get<T>(key);
      if (existing !== null) {
        return existing;
      }

      const response = await factory();
      if (response !== null && response !== undefined) {
        await this.set(key, response, ttlInSec);
      }
      return response;
    } catch (error) {
      this.logger.error(`Failed to remember value for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get or Set cache with prefix (Cache-Aside pattern with prefix)
   * Combines prefix functionality with remember pattern
   * @template T - The type of value to cache
   * @param {string} prefix - Key prefix for organizing cache keys
   * @param {string} key - Cache key (will be combined with prefix)
   * @param {() => Promise<T>} factory - Function to generate value if not cached
   * @param {number} [ttl] - Optional TTL for the cached value
   * @returns {Promise<T | null>} The cached or generated value, null if factory fails
   */
  async getOrSetWithPrefix<T>(
    prefix: string,
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T | null> {
    const fullKey = `${prefix}:${key}`;
    return this.remember(fullKey, factory, ttl);
  }

  /**
   * Get Redis client instance
   * Provides access to the underlying Redis client for advanced operations
   * @returns {Redis} The Redis client instance
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * Atomic increment with rate limiting using Lua script
   * Prevents race conditions when multiple requests try to increment the same key
   * Implements sliding window rate limiting
   * @param {string} key - The key to track increments for
   * @param {number} limit - Maximum number of increments allowed in the time window
   * @param {number} windowInSeconds - Time window in seconds for rate limiting
   * @returns {Promise<{current: number, remaining: number, resetTime: number}>} Rate limit status
   * @throws {Error} When Redis eval command fails
   */
  async atomicIncrementWithLimit(
    key: string,
    limit: number,
    windowInSeconds: number,
  ): Promise<{ current: number; remaining: number; resetTime: number }> {
    try {
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local current_time = tonumber(ARGV[3])
        
        -- Get current count and window start time
        local current = redis.call('GET', key)
        local window_start = redis.call('GET', key .. ':window')
        
        -- If no window exists or window has expired, start new window
        if not window_start or tonumber(window_start) < current_time - window then
          redis.call('SETEX', key, window, '1')
          redis.call('SETEX', key .. ':window', window, current_time)
          return {1, limit - 1, current_time + window}
        end
        
        -- Check if limit exceeded
        if tonumber(current) >= limit then
          local reset_time = tonumber(window_start) + window
          return {tonumber(current), 0, reset_time}
        end
        
        -- Increment counter
        local new_count = redis.call('INCR', key)
        local remaining = limit - new_count
        local reset_time = tonumber(window_start) + window
        
        return {new_count, remaining, reset_time}
      `;

      const currentTime = Math.floor(Date.now() / 1000);
      const result = (await this.redis.eval(
        luaScript,
        1, // number of keys
        key, // key
        limit.toString(), // limit
        windowInSeconds.toString(), // window
        currentTime.toString(), // current time
      )) as number[];

      return {
        current: result[0],
        remaining: result[1],
        resetTime: result[2],
      };
    } catch (error) {
      this.logger.error(
        `Failed to perform atomic increment for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Atomic compare and swap using Lua script
   * Updates a value only if it matches the expected value (optimistic locking)
   * @param {string} key - The key to update
   * @param {unknown} expectedValue - The expected current value (null means key shouldn't exist)
   * @param {unknown} newValue - The new value to set
   * @param {number} [ttl] - Optional TTL for the key
   * @returns {Promise<boolean>} True if update was successful, false if values didn't match
   * @throws {Error} When Redis eval command fails
   */
  async compareAndSwap(
    key: string,
    expectedValue: unknown,
    newValue: unknown,
    ttl?: number,
  ): Promise<boolean> {
    try {
      const luaScript = `
        local key = KEYS[1]
        local expected = ARGV[1]
        local new_val = ARGV[2]
        local ttl = tonumber(ARGV[3])
        
        -- Get current value
        local current = redis.call('GET', key)
        
        -- If key doesn't exist and expected is nil, set the value
        if not current and expected == 'NIL' then
          if ttl and ttl > 0 then
            redis.call('SETEX', key, ttl, new_val)
          else
            redis.call('SET', key, new_val)
          end
          return 1
        end
        
        -- If current value matches expected, update it
        if current == expected then
          if ttl and ttl > 0 then
            redis.call('SETEX', key, ttl, new_val)
          else
            redis.call('SET', key, new_val)
          end
          return 1
        end
        
        -- Values don't match, return 0
        return 0
      `;

      const expected =
        expectedValue === null ? 'NIL' : JSON.stringify(expectedValue);
      const newVal = JSON.stringify(newValue);
      const ttlStr = ttl ? ttl.toString() : '0';

      const result = (await this.redis.eval(
        luaScript,
        1, // number of keys
        key, // key
        expected, // expected value
        newVal, // new value
        ttlStr, // TTL
      )) as number;

      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to perform compare and swap for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Atomic multi-key operation using Lua script
   * Performs multiple operations atomically in a single Redis transaction
   * @param {Array<{type: 'set' | 'delete' | 'increment', key: string, value?: unknown, ttl?: number}>} operations - Array of operations to perform
   * @returns {Promise<boolean>} True if all operations completed successfully
   * @throws {Error} When Redis eval command fails
   */
  async atomicMultiOperation(
    operations: {
      type: 'set' | 'delete' | 'increment';
      key: string;
      value?: unknown;
      ttl?: number;
    }[],
  ): Promise<boolean> {
    try {
      const luaScript = `
        local operations = cjson.decode(ARGV[1])
        local results = {}
        
        for i, op in ipairs(operations) do
          if op.type == 'set' then
            if op.ttl and op.ttl > 0 then
              redis.call('SETEX', op.key, op.ttl, op.value)
            else
              redis.call('SET', op.key, op.value)
            end
            table.insert(results, 'OK')
          elseif op.type == 'delete' then
            local deleted = redis.call('DEL', op.key)
            table.insert(results, deleted)
          elseif op.type == 'increment' then
            local incremented = redis.call('INCR', op.key)
            table.insert(results, incremented)
          end
        end
        
        return cjson.encode(results)
      `;

      const operationsData = operations.map((op) => ({
        type: op.type,
        key: op.key,
        value: op.value ? JSON.stringify(op.value) : null,
        ttl: op.ttl || 0,
      }));

      const result = (await this.redis.eval(
        luaScript,
        0, // no keys
        JSON.stringify(operationsData), // operations data
      )) as string;

      return result !== null;
    } catch (error) {
      this.logger.error('Failed to perform atomic multi-operation:', error);
      throw error;
    }
  }
}
