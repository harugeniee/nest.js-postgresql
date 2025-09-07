/**
 * Response DTO for rate limit check
 */
export class RateLimitResponseDto {
  allowed!: boolean;
  headers!: Record<string, string>;
  retryAfter?: number;
}

/**
 * Response DTO for policy match test
 */
export class PolicyMatchResponseDto {
  matches!: boolean;
  policy!: any | null; // RateLimitPolicy entity
}

/**
 * Response DTO for cache statistics
 */
export class CacheStatsResponseDto {
  planCount!: number;
  ipWhitelistCount!: number;
  apiKeyCount!: number;
  policyCount!: number;
}

/**
 * Response DTO for rate limit info
 */
export class RateLimitInfoResponseDto {
  current!: number;
  limit!: number;
  resetTime?: number;
}
