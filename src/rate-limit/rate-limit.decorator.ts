import { SetMetadata } from '@nestjs/common';

import { RateLimitOverride, RateLimitConfig } from '../common/interface';

/**
 * Metadata key for rate limit overrides
 */
export const RATE_LIMIT_OVERRIDE_KEY = 'rate_limit_override';

/**
 * Metadata key for advanced rate limit configuration
 */
export const RATE_LIMIT_META_KEY = 'rate_limit_meta';

// RateLimitOverride interface is now imported from common/interface

/**
 * Decorator to override rate limiting for specific routes
 *
 * @param config Rate limit override configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Controller('api')
 * export class ApiController {
 *   @Get('public')
 *   @RateLimitOverride({ plan: 'free' })
 *   getPublicData() {
 *     return { data: 'public' };
 *   }
 *
 *   @Get('admin')
 *   @RateLimitOverride({ bypass: true })
 *   getAdminData() {
 *     return { data: 'admin' };
 *   }
 *
 *   @Post('upload')
 *   @RateLimitOverride({ limit: 10, ttl: 300 })
 *   uploadFile() {
 *     return { success: true };
 *   }
 * }
 * ```
 */
export const RateLimitOverrideDecorator = (config: RateLimitOverride) =>
  SetMetadata(RATE_LIMIT_OVERRIDE_KEY, config);

/**
 * Decorator to bypass rate limiting for a route
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   @Get()
 *   @BypassRateLimit()
 *   check() {
 *     return { status: 'ok' };
 *   }
 * }
 * ```
 */
export const BypassRateLimit = () =>
  SetMetadata(RATE_LIMIT_OVERRIDE_KEY, { bypass: true });

/**
 * Decorator to use a specific plan for a route
 *
 * @param planName Plan name to use
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Controller('api')
 * export class ApiController {
 *   @Get('premium')
 *   @UsePlan('pro')
 *   getPremiumData() {
 *     return { data: 'premium' };
 *   }
 * }
 * ```
 */
export const UsePlan = (planName: string) =>
  SetMetadata(RATE_LIMIT_OVERRIDE_KEY, { plan: planName });

/**
 * Decorator to set custom rate limits for a route
 *
 * @param limit Requests per minute
 * @param ttl Time to live in seconds
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Controller('api')
 * export class ApiController {
 *   @Post('heavy-operation')
 *   @CustomRateLimit(5, 300) // 5 requests per 5 minutes
 *   heavyOperation() {
 *     return { result: 'done' };
 *   }
 * }
 * ```
 */
export const CustomRateLimit = (limit: number, ttl: number = 60) =>
  SetMetadata(RATE_LIMIT_OVERRIDE_KEY, { limit, ttl });

// RateLimitConfig interface is now imported from common/interface

/**
 * Advanced rate limit decorator with policy-based configuration
 *
 * @param config Rate limit configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @Controller('api')
 * export class ApiController {
 *   @Post('messages')
 *   @RateLimit({ policy: 'createMessage', keyBy: ['userId', 'route'] })
 *   createMessage() {
 *     return { success: true };
 *   }
 *
 *   @Get('public')
 *   @RateLimit({ keyBy: ['ip', 'route'] })
 *   getPublicData() {
 *     return { data: 'public' };
 *   }
 *
 *   @Get('health')
 *   @RateLimit({ bypass: true })
 *   healthCheck() {
 *     return { status: 'ok' };
 *   }
 * }
 * ```
 */
export const RateLimit = (config?: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_META_KEY, config || {});
