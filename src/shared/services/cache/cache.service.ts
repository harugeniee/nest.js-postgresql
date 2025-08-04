import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onModuleInit() {
    this.setupRedisEventListeners();
    // await this.clearCache();
  }

  private readonly defaultTtl = 3600; // 1 hour in seconds

  onModuleDestroy() {
    this.redis.quit();
  }

  /**
   * Setup Redis event listeners for logging
   */
  private setupRedisEventListeners() {
    // Connection events
    this.redis.on('connect', () => {
      console.log('🟢 Redis connected');
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis ready');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
    });

    this.redis.on('close', () => {
      console.log('🔴 Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Command events
    this.redis.on('command', (command) => {
      console.log('📤 Redis command sent:', command);
    });

    // Monitor mode for real-time command logging
    this.startMonitoring();
  }

  /**
   * Start Redis monitoring mode to log all commands
   */
  private async startMonitoring() {
    try {
      // Use monitor() method which returns a promise
      await this.redis.monitor();

      // Set up event listener for monitor events
      this.redis.on(
        'monitor',
        (time: number, args: string[], source: string, database: number) => {
          const timestamp = new Date(time * 1000).toISOString();
          console.log(
            `🔍 [${timestamp}] Redis ${source} DB${database}: ${args.join(' ')}`,
          );
        },
      );

      console.log('📊 Redis monitoring started');
    } catch (error) {
      console.error('❌ Failed to start Redis monitoring:', error);
    }
  }

  /**
   * Legacy monitor method (kept for backward compatibility)
   */

  async getRedisInfo() {
    const info = await this.redis.info();
    console.log('Redis info:', info);
  }

  async clearCache() {
    await this.redis.flushall();
    console.log('🧹 Redis cache cleared');
  }

  async getTtl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * Set cache with key and value
   */
  async set(
    key: string,
    value: string | Record<string, any>,
    ttlInSec?: number,
  ): Promise<void> {
    const ttl = ttlInSec ?? this.defaultTtl;
    const serializedValue = JSON.stringify(value);

    console.log(`💾 Setting cache key: ${key}, TTL: ${ttl}s`);

    if (ttl >= 0) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  /**
   * Get cache value by key
   */
  async get(key: string): Promise<any> {
    console.log(`🔍 Getting cache key: ${key}`);
    const value = await this.redis.get(key);

    if (!value) {
      console.log(`❌ Cache miss for key: ${key}`);
      return null;
    }

    console.log(`✅ Cache hit for key: ${key}`);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Delete cache by key
   */
  async delete(key: string): Promise<void> {
    console.log(`🗑️ Deleting cache key: ${key}`);
    await this.redis.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Set cache with prefix
   */
  async setWithPrefix(
    prefix: string,
    key: string,
    value: any,
    ttl?: number,
  ): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.set(fullKey, value, ttl);
  }

  /**
   * Get cache with prefix
   */
  async getWithPrefix(prefix: string, key: string): Promise<any> {
    const fullKey = `${prefix}:${key}`;
    return this.get(fullKey);
  }

  /**
   * Delete cache with prefix
   */
  async deleteWithPrefix(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.delete(fullKey);
  }

  /**
   * Clear cache by pattern (using KEYS - not recommended for production with large datasets)
   */
  async clearCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${pattern}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Delete keys by pattern using SCAN (safe for production)
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysByPattern(
    pattern: string,
    count: number = 100,
  ): Promise<number> {
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
        console.log(
          `🗑️ Deleted ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } while (cursor !== 0);

    console.log(
      `✅ Total deleted: ${deletedCount} keys for pattern: ${pattern}`,
    );
    return deletedCount;
  }

  /**
   * Delete keys by pattern using SCAN with UNLINK (non-blocking, Redis 4.0+)
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysByPatternAsync(
    pattern: string,
    count: number = 100,
  ): Promise<number> {
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
        console.log(
          `🗑️ Unlinked ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } while (cursor !== 0);

    console.log(
      `✅ Total unlinked: ${deletedCount} keys for pattern: ${pattern}`,
    );
    return deletedCount;
  }

  /**
   * Find keys by pattern using SCAN (safe for production)
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async findKeysByPattern(
    pattern: string,
    count: number = 100,
  ): Promise<string[]> {
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

    console.log(`🔍 Found ${keys.length} keys matching pattern: ${pattern}`);
    return keys;
  }

  /**
   * Count keys by pattern using SCAN (safe for production)
   * @param pattern - Redis pattern (e.g., 'ABC:NBN:12*', 'user:*')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async countKeysByPattern(
    pattern: string,
    count: number = 100,
  ): Promise<number> {
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

    console.log(`📊 Found ${totalCount} keys matching pattern: ${pattern}`);
    return totalCount;
  }

  /**
   * Delete multiple keys by patterns
   * @param patterns - Array of Redis patterns
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysByPatterns(
    patterns: string[],
    count: number = 100,
  ): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const pattern of patterns) {
      const deletedCount = await this.deleteKeysByPattern(pattern, count);
      results[pattern] = deletedCount;
    }

    console.log(`✅ Deleted keys by patterns:`, results);
    return results;
  }

  /**
   * Delete keys by prefix (convenience method)
   * @param prefix - Key prefix (e.g., 'ABC:NBN:12')
   * @param count - Number of keys to scan per iteration (default: 100)
   */
  async deleteKeysByPrefix(
    prefix: string,
    count: number = 100,
  ): Promise<number> {
    return this.deleteKeysByPattern(`${prefix}*`, count);
  }

  /**
   * Delete keys by suffix (convenience method)
   * @param suffix - Key suffix (e.g., ':123')
   * @param count - Number of keys to scan per iteration (default: 100)
   *
   * Pattern matching examples:
   * - *suffix - Ends with suffix (e.g., '*:123', '*_expired')
   * - prefix* - Starts with prefix (e.g., 'user:*', 'ABC:NBN:*')
   * - *pattern* - Contains pattern in the middle (e.g., '*:user:*', '*cache*')
   * - *:12? - Ends with :12 + 1 character (e.g., '*:123', '*:12a')
   * - *:12[34] - Ends with :123 or :124
   */
  async deleteKeysBySuffix(
    suffix: string,
    count: number = 100,
  ): Promise<number> {
    return this.deleteKeysByPattern(`${suffix}`, count);
  }

  /**
   * Reset all cache
   */
  async reset(): Promise<void> {
    await this.redis.flushall();
  }

  /**
   * Set lock
   */
  async setLock(identifier: string, ttl: number): Promise<boolean> {
    const key = `lock:${identifier}`;
    const lock = await this.redis.get(key);
    if (lock) {
      return true;
    } else {
      await this.redis.setex(key, ttl, 'true');
      return false;
    }
  }

  /**
   * Remember pattern (Cache-Aside)
   */
  async remember<T>(
    key: string,
    cb: () => Promise<T>,
    ttlInSec?: number,
  ): Promise<T | null> {
    const exists = (await this.get(key)) as T | null;
    if (!exists) {
      try {
        const response = await cb();
        if (ttlInSec) {
          await this.set(key, response as any, ttlInSec);
        } else {
          await this.set(key, response as any);
        }
        return response;
      } catch {
        return null;
      }
    }
    return exists;
  }

  /**
   * Get or Set cache with prefix
   */
  async getOrSetWithPrefix(
    prefix: string,
    key: string,
    factory: () => Promise<any>,
    ttl?: number,
  ): Promise<any> {
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
  }

  /**
   * Atomic compare and swap using Lua script
   * Updates a value only if it matches the expected value
   */
  async compareAndSwap(
    key: string,
    expectedValue: any,
    newValue: any,
    ttl?: number,
  ): Promise<boolean> {
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
  }

  /**
   * Atomic multi-key operation using Lua script
   * Performs multiple operations atomically
   */
  async atomicMultiOperation(
    operations: {
      type: 'set' | 'delete' | 'increment';
      key: string;
      value?: any;
      ttl?: number;
    }[],
  ): Promise<boolean> {
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
  }
}
