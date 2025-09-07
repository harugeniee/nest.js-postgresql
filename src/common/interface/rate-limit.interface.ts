/**
 * Rate Limit Interfaces
 * Centralized interfaces for rate limiting functionality
 */

/**
 * Context for rate limit checking
 */
export interface RateLimitContext {
  ip: string;
  routeKey: string;
  apiKey?: string;
  userId?: string;
  orgId?: string;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  retryAfter?: number;
}

/**
 * API key resolution result
 */
export interface ApiKeyResolution {
  kind: 'anonymous' | 'apiKey' | 'invalid';
  plan?: string;
  isWhitelist?: boolean;
}

/**
 * Rate limit plan configuration
 */
export interface RateLimitPlan {
  name: string;
  limitPerMin: number;
  ttlSec: number;
  description?: string;
  active: boolean;
  displayOrder: number;
}

/**
 * API key data for creation/update
 */
export interface ApiKeyData {
  key: string;
  plan: string;
  name?: string;
  ownerId?: string;
  isWhitelist?: boolean;
  expiresAt?: Date;
}

/**
 * IP whitelist data for creation/update
 */
export interface IpWhitelistData {
  ip: string;
  description?: string;
  reason?: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  planCount: number;
  ipWhitelistCount: number;
  apiKeyCount: number;
  policyCount: number;
}

/**
 * Rate limit information for a specific key
 */
export interface RateLimitInfo {
  current: number;
  limit: number;
  resetTime?: number;
}

/**
 * Rate limit override configuration from decorators
 */
export interface RateLimitOverride {
  /** Plan name to use for this route */
  plan?: string;
  /** Custom limit per minute */
  limit?: number;
  /** Custom TTL in seconds */
  ttl?: number;
  /** Whether to bypass rate limiting entirely */
  bypass?: boolean;
  /** Custom route key for rate limiting */
  routeKey?: string;
}

/**
 * Advanced rate limit configuration
 */
export interface RateLimitConfig {
  /** Specific policy name to use */
  policy?: string;
  /** Key generation strategy */
  keyBy?: Array<'ip' | 'userId' | 'orgId' | 'route' | 'apiKey'>;
  /** Bypass rate limiting entirely */
  bypass?: boolean;
}

/**
 * Rate limit metadata from decorators
 */
export interface RateLimitMetadata {
  policy?: string;
  keyBy?: Array<'ip' | 'userId' | 'orgId' | 'route' | 'apiKey'>;
  bypass?: boolean;
}

/**
 * Resolved rate limit configuration
 */
export interface ResolvedRateLimit {
  policy: any; // RateLimitPolicy entity
  keyParts: string[];
  routeKey: string;
  context: RateLimitContext;
}
