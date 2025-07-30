import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private defaultTtl = 3600; // 1 hour in seconds

  /**
   * Set cache với key và value
   */
  async set(
    key: string,
    value: string | Record<string, any>,
    ttlInSec?: number,
  ): Promise<void> {
    const ttl = ttlInSec ? ttlInSec : this.defaultTtl;
    const serializedValue = JSON.stringify(value);

    if (ttl >= 0) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  /**
   * Get cache value theo key
   */
  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Delete cache theo key
   */
  async delete(key: string): Promise<void> {
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
   * Set cache với prefix
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
   * Get cache với prefix
   */
  async getWithPrefix(prefix: string, key: string): Promise<any> {
    const fullKey = `${prefix}:${key}`;
    return this.get(fullKey);
  }

  /**
   * Delete cache với prefix
   */
  async deleteWithPrefix(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.delete(fullKey);
  }

  /**
   * Clear cache by pattern
   */
  async clearCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${pattern}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
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
   * Get hoặc Set cache với prefix
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
}
