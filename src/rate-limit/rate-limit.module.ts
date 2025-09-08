import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheModule } from '../shared/services/cache/cache.module';
import {
  ApiKey,
  IpWhitelist,
  Plan,
  RateLimitLog,
  RateLimitPolicy,
} from './entities';
import { RateLimitAdminController } from './rate-limit-admin.controller';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

/**
 * Simplified Rate Limit Module
 * Single service + guard approach for easier maintenance
 *
 * Features:
 * - Dynamic rate limits based on API keys and plans
 * - IP whitelist support for bypassing rate limits
 * - Redis-based distributed rate limiting
 * - Cache invalidation across multiple instances
 * - Admin endpoints for managing rate limits
 */
@Global()
@Module({
  imports: [
    // Import CacheModule to access CacheService
    CacheModule,
    // Register entities with TypeORM
    TypeOrmModule.forFeature([
      Plan,
      ApiKey,
      IpWhitelist,
      RateLimitPolicy,
      RateLimitLog,
    ]),
  ],
  providers: [
    // Single rate limit service
    RateLimitService,
    // Single rate limit guard
    RateLimitGuard,
  ],
  controllers: [
    // Admin controller for managing rate limits
    RateLimitAdminController,
  ],
  exports: [
    // Export services for use in other modules
    RateLimitService,
    RateLimitGuard,
  ],
})
export class RateLimitModule {}
