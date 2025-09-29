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
    void this.reset();
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
   * Note: Lua scripts (EVAL/EVALSHA) are logged but internal Redis commands within scripts are not visible
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
          const command = args.join(' ');

          // Special handling for Lua scripts
          if (args[0] === 'EVAL' || args[0] === 'EVALSHA') {
            this.logger.debug(
              `🔍 [${timestamp}] Redis ${source} DB${database}: ${args[0]} (Lua Script) - ${args.length - 2} keys, ${args[args.length - 1]} args`,
            );
            this.logger.debug(
              `📜 Lua Script Preview: ${args[1]?.substring(0, 100)}${args[1]?.length > 100 ? '...' : ''}`,
            );
          } else {
            this.logger.debug(
              `🔍 [${timestamp}] Redis ${source} DB${database}: ${command}`,
            );
          }
        },
      );

      this.logger.log('📊 Redis monitoring started');
      this.logger.warn(
        '⚠️ Note: Lua script internal commands are not visible in MONITOR output',
      );
    } catch (error) {
      this.logger.error('❌ Failed to start Redis monitoring:', error);
    }
  }

  /**
   * Get Redis server information and statistics
   *
   * @returns {Promise<string>} Redis server information string returned by the `INFO` command.
   * The string contains multiple sections and key/value pairs describing the server status.
   *
   * @throws {Error} When Redis `INFO` command fails or the client connection is not available.
   *
   * @example
   * const info = await cacheService.getRedisInfo();
   * // Use the info string for diagnostics or logging
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
   * Clear all cache entries from all Redis databases.
   *
   * @remarks
   * This uses `FLUSHALL` which removes keys across all databases in the current Redis instance.
   * It is destructive and should be used with extreme caution in production environments.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   * @throws {Error} When Redis `FLUSHALL` command fails.
   *
   * @example
   * await cacheService.clearCache();
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
   * Get Time-To-Live (TTL) for a specific cache key.
   *
   * @param {string} key - The cache key to check TTL for.
   * @returns {Promise<number>} Number of seconds until expiration.
   * Returns `-1` if the key exists but has no associated expiration.
   * Returns `-2` if the key does not exist.
   *
   * @throws {Error} When Redis `TTL` command fails.
   *
   * @example
   * const ttl = await cacheService.getTtl('user:123');
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
   * Set a cache entry with optional TTL.
   *
   * @param {string} key - Cache key to store the value under.
   * @param {unknown} value - Value to cache. It will be JSON serialized.
   * @param {number} [ttlInSec] - Optional TTL in seconds. If omitted, defaults to the service default TTL.
   * If a negative value is provided, the key will be set without expiration.
   *
   * @returns {Promise<void>} Resolves when the value is stored.
   * @throws {Error} When Redis `SET`/`SETEX` operation fails.
   *
   * @example
   * await cacheService.set('user:123', { id: 123, name: 'Alice' }, 600);
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
   * Get a cache entry by key.
   *
   * @template T - Expected type of the cached value after deserialization.
   * @param {string} key - Cache key to retrieve.
   * @returns {Promise<T | null>} The parsed value if key exists, otherwise `null`.
   * If the stored value is not valid JSON, the raw string is returned as type `T`.
   *
   * @throws {Error} When Redis `GET` command fails.
   *
   * @example
   * const user = await cacheService.get<User>('user:123');
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
   * Delete a cache entry by key.
   *
   * @param {string} key - Cache key to delete.
   * @returns {Promise<void>} Resolves even if the key did not exist.
   * @throws {Error} When Redis `DEL` command fails.
   *
   * @example
   * await cacheService.delete('user:123');
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
   * Check existence of a cache key.
   *
   * @param {string} key - Cache key to check.
   * @returns {Promise<boolean>} `true` if the key exists, otherwise `false`.
   * @throws {Error} When Redis `EXISTS` command fails.
   *
   * @example
   * const present = await cacheService.exists('user:123');
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
   * Set a cache entry using a namespaced prefix.
   *
   * @param {string} prefix - Prefix to prepend to the key (e.g., `user`).
   * @param {string} key - Key segment (e.g., `123`). The full key becomes `prefix:key`.
   * @param {unknown} value - Value to cache. It will be JSON serialized.
   * @param {number} [ttl] - Optional TTL in seconds.
   * @returns {Promise<void>} Resolves when the value is stored.
   *
   * @example
   * await cacheService.setWithPrefix('user', '123', { id: 123 });
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
   * Get a cache entry using a namespaced prefix.
   *
   * @template T - Expected type of the cached value after deserialization.
   * @param {string} prefix - Prefix used when setting the cache.
   * @param {string} key - Key segment to combine with the prefix.
   * @returns {Promise<T | null>} The parsed value if present, otherwise `null`.
   *
   * @example
   * const user = await cacheService.getWithPrefix<User>('user', '123');
   */
  async getWithPrefix<T>(prefix: string, key: string): Promise<T | null> {
    const fullKey = `${prefix}:${key}`;
    return this.get<T>(fullKey);
  }

  /**
   * Delete a cache entry using a namespaced prefix.
   *
   * @param {string} prefix - Prefix used when setting the cache.
   * @param {string} key - Key segment to combine with the prefix.
   * @returns {Promise<void>} Resolves even if the key did not exist.
   *
   * @example
   * await cacheService.deleteWithPrefix('user', '123');
   */
  async deleteWithPrefix(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.delete(fullKey);
  }

  /**
   * Delete keys by pattern using `SCAN` + `DEL` (safe for production).
   *
   * @remarks
   * Uses incremental iteration with `SCAN` to avoid blocking Redis. Deletion is blocking per batch.
   *
   * @param {string} pattern - Redis glob-style pattern (e.g., `user:*`, `*:profile`).
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<number>} Total number of keys deleted.
   * @throws {Error} When `SCAN` or `DEL` commands fail.
   *
   * @example
   * const deleted = await cacheService.deleteKeysByPattern('user:*', 500);
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
   * Delete keys by pattern using `SCAN` + `UNLINK` (non-blocking delete).
   *
   * @remarks
   * `UNLINK` asynchronously frees memory and is preferred in production for large deletions.
   *
   * @param {string} pattern - Redis glob-style pattern (e.g., `user:*`).
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<number>} Total number of keys scheduled for unlink (unlinked count).
   * @throws {Error} When `SCAN` or `UNLINK` commands fail.
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
   * Find keys by pattern using `SCAN` (safe for production).
   *
   * @param {string} pattern - Redis glob-style pattern.
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<string[]>} All keys that match the pattern.
   * @throws {Error} When Redis `SCAN` command fails.
   *
   * @example
   * const keys = await cacheService.findKeysByPattern('user:*');
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
   * Count keys by pattern using `SCAN` (safe for production).
   *
   * @param {string} pattern - Redis glob-style pattern.
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<number>} Total count of keys matching the pattern.
   * @throws {Error} When Redis `SCAN` command fails.
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
   * Delete multiple sets of keys given multiple patterns.
   *
   * @param {string[]} patterns - Array of Redis patterns to match.
   * @param {number} [count=100] - Approximate number of keys to scan per iteration for each pattern.
   * @returns {Promise<Record<string, number>>} Map from pattern to number of deleted keys.
   * @throws {Error} When any underlying Redis operation fails.
   *
   * @example
   * const result = await cacheService.deleteKeysByPatterns(['user:*', 'post:*']);
   * // result = { 'user:*': 120, 'post:*': 42 }
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
   * Delete keys by prefix (convenience).
   *
   * @param {string} prefix - Key prefix (e.g., `user:` or `ABC:NBN:12`).
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<number>} Total number of keys deleted.
   */
  async deleteKeysByPrefix(prefix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`${prefix}*`, count);
  }

  /**
   * Delete keys by suffix (convenience).
   *
   * @param {string} suffix - Key suffix (e.g., `:123`).
   * @param {number} [count=100] - Approximate number of keys to scan per iteration.
   * @returns {Promise<number>} Total number of keys deleted.
   */
  async deleteKeysBySuffix(suffix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`*${suffix}`, count);
  }

  /**
   * Reset the Redis instance by removing all keys from all databases.
   *
   * @returns {Promise<void>} Resolves when the operation completes.
   * @throws {Error} When Redis `FLUSHALL` command fails.
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
   * Acquire a simple distributed lock with TTL.
   *
   * @remarks
   * This implementation is a basic best-effort lock using a single key with `SETEX`.
   * It does not implement fencing tokens or unique ownership checks. Use Redlock for stronger guarantees.
   *
   * @param {string} identifier - Unique lock identifier.
   * @param {number} ttl - Lock TTL in seconds.
   * @returns {Promise<boolean>} `true` if the lock was acquired, `false` if the lock already exists.
   * @throws {Error} When Redis operations fail.
   *
   * @example
   * const acquired = await cacheService.setLock('job:sync', 30);
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
   * Release a previously acquired distributed lock.
   *
   * @param {string} identifier - Unique identifier for the lock to release.
   * @returns {Promise<void>} Resolves whether or not the lock existed.
   * @throws {Error} When Redis `DEL` command fails.
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
   * Cache-aside helper that returns the cached value or computes and stores it.
   *
   * @template T - Type of the value to return and cache.
   * @param {string} key - Cache key to store/retrieve the value.
   * @param {() => Promise<T>} factory - Async function to compute the value when cache miss occurs.
   * @param {number} [ttlInSec] - Optional TTL for the cached value; falls back to default TTL when omitted.
   * @returns {Promise<T | null>} Cached or freshly computed value. Returns `null` if the factory throws or returns `null`/`undefined`.
   *
   * @example
   * const data = await cacheService.remember('config', loadConfig, 300);
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
   * Cache-aside with namespacing using a prefix.
   *
   * @template T - Type of the value to return and cache.
   * @param {string} prefix - Key prefix for organizing cache keys.
   * @param {string} key - Cache key segment to combine with the prefix.
   * @param {() => Promise<T>} factory - Async function to compute the value when cache miss occurs.
   * @param {number} [ttl] - Optional TTL for the cached value.
   * @returns {Promise<T | null>} Cached or freshly computed value, or `null` if factory fails.
   *
   * @example
   * const profile = await cacheService.getOrSetWithPrefix('user', '123', () => fetchUser(123), 600);
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
   * Get the underlying Redis client instance.
   *
   * @returns {Redis} Connected Redis client for advanced or custom operations.
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * Atomic increment with sliding window rate limiting using a Lua script.
   *
   * @param {string} key - Counter key used to track increments.
   * @param {number} limit - Maximum number of increments allowed within the window.
   * @param {number} windowInSeconds - Sliding window size in seconds.
   * @returns {Promise<{ current: number; remaining: number; resetTime: number }>} Object with:
   * - `current`: current number of increments in the active window
   * - `remaining`: how many increments remain before hitting the limit
   * - `resetTime`: UNIX timestamp (seconds) when the window resets
   *
   * @throws {Error} When Lua evaluation fails.
   *
   * @example
   * const { current, remaining, resetTime } = await cacheService.atomicIncrementWithLimit('login:ip:1.2.3.4', 5, 60);
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
   * Atomic compare-and-swap (CAS) operation using a Lua script.
   *
   * @param {string} key - Key to update.
   * @param {unknown} expectedValue - Expected current value. Use `null` to indicate that the key must not exist.
   * @param {unknown} newValue - New value to set when the expected value matches. Will be JSON serialized.
   * @param {number} [ttl] - Optional TTL for the key; if omitted or `<= 0`, no expiration is set.
   * @returns {Promise<boolean>} `true` if the value was set, `false` when the expected value did not match.
   * @throws {Error} When Lua evaluation fails.
   *
   * @example
   * const updated = await cacheService.compareAndSwap('config:version', '1', '2', 300);
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
   * Atomically perform multiple operations using a Lua script.
   *
   * @param {Array<{type: 'set' | 'delete' | 'increment', key: string, value?: unknown, ttl?: number}>} operations
   * Array of operations to perform. For `set`, `value` is JSON-stringified and `ttl` is optional.
   * @returns {Promise<boolean>} `true` if the script executed and returned a non-null response.
   * @throws {Error} When Lua evaluation fails.
   *
   * @example
   * await cacheService.atomicMultiOperation([
   *   { type: 'set', key: 'a', value: { x: 1 }, ttl: 60 },
   *   { type: 'increment', key: 'b' },
   *   { type: 'delete', key: 'c' },
   * ]);
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
