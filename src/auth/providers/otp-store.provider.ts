import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/services';
import { OtpData, OtpStore } from '../interfaces';

/**
 * Redis-based OTP store implementation
 * Uses Redis for storing OTP data with TTL support
 */
@Injectable()
export class RedisOtpStore implements OtpStore {
  private readonly logger = new Logger(RedisOtpStore.name);
  private readonly keyPrefix = 'otp:';

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Store OTP data with TTL
   * @param key - Unique key for the OTP (usually email-based)
   * @param data - OTP data to store
   * @param ttlInSec - Time to live in seconds
   */
  async set(key: string, data: OtpData, ttlInSec: number): Promise<void> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      await this.cacheService.set(fullKey, data, ttlInSec);
      this.logger.debug(`OTP stored for key: ${key}, TTL: ${ttlInSec}s`);
    } catch (error) {
      this.logger.error(`Failed to store OTP for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve OTP data by key
   * @param key - Unique key for the OTP
   * @returns OTP data or null if not found/expired
   */
  async get(key: string): Promise<OtpData | null> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const data = await this.cacheService.get<OtpData>(fullKey);

      if (!data) {
        this.logger.debug(`OTP not found for key: ${key}`);
        return null;
      }

      // Check if OTP is expired
      if (Date.now() > data.expiresAt) {
        this.logger.debug(`OTP expired for key: ${key}`);
        await this.delete(key);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to get OTP for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete OTP data by key
   * @param key - Unique key for the OTP
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      await this.cacheService.delete(fullKey);
      this.logger.debug(`OTP deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete OTP for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment attempt count for an OTP using atomic operation
   * @param key - Unique key for the OTP
   * @returns Updated OTP data or null if not found
   */
  async incrementAttempts(key: string): Promise<OtpData | null> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;

      // Use Lua script for atomic increment
      const luaScript = `
        local key = KEYS[1]
        local data = redis.call('GET', key)
        
        if not data then
          return nil
        end
        
        local otpData = cjson.decode(data)
        otpData.attempts = otpData.attempts + 1
        
        redis.call('SET', key, cjson.encode(otpData))
        return cjson.encode(otpData)
      `;

      const redis = this.cacheService.getRedisClient();
      const result = (await redis.eval(luaScript, 1, fullKey)) as string;

      if (!result) {
        this.logger.debug(`OTP not found for increment attempts: ${key}`);
        return null;
      }

      const updatedData = JSON.parse(result) as OtpData;
      this.logger.debug(
        `OTP attempts incremented for key: ${key}, attempts: ${updatedData.attempts}`,
      );

      return updatedData;
    } catch (error) {
      this.logger.error(
        `Failed to increment attempts for OTP key ${key}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Mark OTP as used and delete it using atomic operation
   * @param key - Unique key for the OTP
   * @returns Whether the operation was successful
   */
  async markAsUsed(key: string): Promise<boolean> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;

      // Use Lua script for atomic mark as used and delete
      const luaScript = `
        local key = KEYS[1]
        local data = redis.call('GET', key)
        
        if not data then
          return 0
        end
        
        local otpData = cjson.decode(data)
        otpData.isUsed = true
        
        -- Delete the OTP after marking as used
        redis.call('DEL', key)
        return 1
      `;

      const redis = this.cacheService.getRedisClient();
      const result = (await redis.eval(luaScript, 1, fullKey)) as number;

      const success = result === 1;
      this.logger.debug(
        `OTP marked as used for key: ${key}, success: ${success}`,
      );

      return success;
    } catch (error) {
      this.logger.error(`Failed to mark OTP as used for key ${key}:`, error);
      throw error;
    }
  }
}
