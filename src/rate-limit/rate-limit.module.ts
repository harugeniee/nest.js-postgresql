import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Plan } from './entities/plan.entity';
import { ApiKey } from './entities/api-key.entity';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { RateLimitPolicy } from './entities/rate-limit-policy.entity';
import { RateLimitLog } from './entities/rate-limit-log.entity';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitAdminController } from './rate-limit-admin.controller';

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
