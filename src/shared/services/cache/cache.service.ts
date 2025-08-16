import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

// CacheOptions defines cache configuration for consumers of CacheService
// - enabled: toggle caching behavior
// - ttlSec: default time-to-live in seconds
// - prefix: optional key namespace prefix
// - swrSec: optional stale-while-revalidate window in seconds
export interface CacheOptions {
  enabled: boolean;
  ttlSec: number;
  prefix?: string;
  swrSec?: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = 3600; // 1 hour in seconds

  constructor(@InjectRedis() private readonly redis: Redis) {}

  onModuleInit(): void {
    this.setupRedisEventListeners();
  }

  onModuleDestroy(): void {
    void this.redis.quit();
  }

  /**
   * Setup Redis event listeners for logging and monitoring
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
   * Get Redis server information
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
   * Clear all cache (use with caution in production)
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
   * Get TTL for a key
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
   * Set cache with key and value
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
   * Delete cache by key
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
   * Check if key exists
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
   * Set cache with prefix
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
   */
  async getWithPrefix<T>(prefix: string, key: string): Promise<T | null> {
    const fullKey = `${prefix}:${key}`;
    return this.get<T>(fullKey);
  }

  /**
   * Delete cache with prefix
   */
  async deleteWithPrefix(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.delete(fullKey);
  }

  /**
   * Clear cache by pattern using SCAN (safe for production)
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
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
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
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
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
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
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
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
   * Delete multiple keys by patterns
   * @param patterns - Array of Redis patterns
   * @param count - Number of keys to scan per iteration (default: 100)
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
   * @param prefix - Key prefix (e.g., 'ABC:NBN:12')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysByPrefix(prefix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`${prefix}*`, count);
  }

  /**
   * Delete keys by suffix (convenience method)
   * @param suffix - Key suffix (e.g., ':123')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysBySuffix(suffix: string, count = 100): Promise<number> {
    return this.deleteKeysByPattern(`*${suffix}`, count);
  }

  /**
   * Reset all cache
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
   * Set distributed lock
   * @param identifier - Lock identifier
   * @param ttl - Lock TTL in seconds
   * @returns true if lock was acquired, false if already locked
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
   * @param identifier - Lock identifier
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
   * @param key - Cache key
   * @param factory - Function to generate value if not cached
   * @param ttlInSec - Optional TTL override
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
   * Get or Set cache with prefix
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
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * Atomic increment with rate limiting using Lua script
   * This prevents race conditions when multiple requests try to increment the same key
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
   * Updates a value only if it matches the expected value
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
   * Performs multiple operations atomically
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
