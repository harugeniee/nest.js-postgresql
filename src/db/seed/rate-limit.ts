import { COMMON_CONSTANTS } from 'src/shared/constants';

/**
 * Rate Limit Seed Data
 * Comprehensive sample data for all rate limiting entities
 * Based on entity relationships and migration data
 */

// Sample rate limit plans
const plansSeed = [
  {
    name: 'anonymous',
    limitPerMin: 30,
    ttlSec: 60,
    description: 'Default plan for anonymous users - 30 requests per minute',
    active: true,
    displayOrder: 1,
    apiKeys: [],
  },
  {
    name: 'free',
    limitPerMin: 100,
    ttlSec: 60,
    description: 'Free tier plan - 100 requests per minute',
    active: true,
    displayOrder: 2,
    apiKeys: [
      {
        key: 'ak_free_1234567890abcdef',
        name: 'Free Tier API Key',
        active: true,
        status: COMMON_CONSTANTS.STATUS.ACTIVE,
        isWhitelist: false,
        expiresAt: new Date('2025-12-31'),
      },
    ],
  },
  {
    name: 'pro',
    limitPerMin: 500,
    ttlSec: 60,
    description: 'Professional plan - 500 requests per minute',
    active: true,
    displayOrder: 3,
    apiKeys: [
      {
        key: 'ak_pro_abcdef1234567890',
        name: 'Pro Tier API Key',
        active: true,
        status: COMMON_CONSTANTS.STATUS.ACTIVE,
        isWhitelist: false,
        expiresAt: new Date('2025-12-31'),
      },
      {
        key: 'ak_mobile_app_12345',
        name: 'Mobile App Key',
        active: true,
        status: COMMON_CONSTANTS.STATUS.ACTIVE,
        isWhitelist: false,
        expiresAt: new Date('2024-06-30'),
      },
    ],
  },
  {
    name: 'enterprise',
    limitPerMin: 2000,
    ttlSec: 60,
    description: 'Enterprise plan - 2000 requests per minute',
    active: true,
    displayOrder: 4,
    apiKeys: [
      {
        key: 'ak_enterprise_9876543210fedcba',
        name: 'Enterprise API Key',
        active: true,
        status: COMMON_CONSTANTS.STATUS.ACTIVE,
        isWhitelist: false,
        expiresAt: new Date('2025-12-31'),
      },
      {
        key: 'ak_whitelist_bypass_all_limits',
        name: 'Whitelisted API Key',
        active: true,
        status: COMMON_CONSTANTS.STATUS.ACTIVE,
        isWhitelist: true, // Bypasses all rate limits
      },
    ],
  },
];

// Sample API keys
const apiKeysSeed = [
  {
    key: 'ak_free_1234567890abcdef',
    planId: 'free', // Will be resolved to actual plan ID
    name: 'Free Tier API Key',
    userId: 'user_123',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    isWhitelist: false,
    expiresAt: new Date('2025-12-31'),
  },
  {
    key: 'ak_pro_abcdef1234567890',
    planId: 'pro',
    name: 'Pro Tier API Key',
    userId: 'user_456',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    isWhitelist: false,
    expiresAt: new Date('2025-12-31'),
  },
  {
    key: 'ak_enterprise_9876543210fedcba',
    planId: 'enterprise',
    name: 'Enterprise API Key',
    userId: 'user_789',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    isWhitelist: false,
    expiresAt: new Date('2025-12-31'),
  },
  {
    key: 'ak_whitelist_bypass_all_limits',
    planId: 'enterprise',
    name: 'Whitelisted API Key',
    userId: 'admin',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    isWhitelist: true, // Bypasses all rate limits
  },
  {
    key: 'ak_mobile_app_12345',
    planId: 'pro',
    name: 'Mobile App Key',
    userId: 'user_mobile',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    isWhitelist: false,
    expiresAt: new Date('2024-06-30'),
  },
];

// Sample IP whitelist entries
const ipWhitelistSeed = [
  {
    ip: '127.0.0.1',
    description: 'Localhost development',
    reason: 'development',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
  },
  {
    ip: '::1',
    description: 'Localhost IPv6',
    reason: 'development',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
  },
  {
    ip: '192.168.1.0/24',
    description: 'Office network',
    reason: 'internal',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
  },
  {
    ip: '10.0.0.0/8',
    description: 'Internal network',
    reason: 'internal',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
  },
  {
    ip: '172.16.0.0/12',
    description: 'Private network range',
    reason: 'internal',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
  },
];

// Sample rate limit policies
const rateLimitPoliciesSeed = [
  {
    name: 'global-default',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 50,
    scope: 'global' as const,
    strategy: 'fixedWindow' as const,
    limit: 100,
    windowSec: 60,
    description: 'Global default rate limit - 100 requests per minute',
  },
  {
    name: 'api-read-heavy',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 80,
    scope: 'route' as const,
    routePattern: '^GET:/api/v1/.*',
    strategy: 'tokenBucket' as const,
    burst: 200,
    refillPerSec: 10,
    description:
      'Heavy read operations - 200 requests per minute with token bucket',
  },
  {
    name: 'api-write-strict',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 90,
    scope: 'route' as const,
    routePattern: '^(POST|PUT|DELETE):/api/v1/.*',
    strategy: 'fixedWindow' as const,
    limit: 20,
    windowSec: 60,
    description: 'Write operations - 20 requests per minute',
  },
  {
    name: 'admin-operations',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 100,
    scope: 'route' as const,
    routePattern: '^.*:/api/v1/admin/.*',
    strategy: 'tokenBucket' as const,
    burst: 50,
    refillPerSec: 5,
    description: 'Admin operations - 50 requests per minute with burst',
  },
  {
    name: 'api-create-message',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 85,
    scope: 'route' as const,
    routePattern: '^POST:/api/v1/messages$',
    strategy: 'tokenBucket' as const,
    burst: 20,
    refillPerSec: 5,
    description: 'Message creation - 20 burst with 5 refill per second',
  },
  {
    name: 'file-upload-policy',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 95,
    scope: 'route' as const,
    routePattern: '^POST:/api/v1/files/upload$',
    strategy: 'tokenBucket' as const,
    burst: 5,
    refillPerSec: 1,
    description: 'File upload - 5 burst with 1 refill per second',
  },
  {
    name: 'vip-user-policy',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 200,
    scope: 'user' as const,
    strategy: 'tokenBucket' as const,
    burst: 1000,
    refillPerSec: 50,
    extra: {
      userIds: ['user_vip_001', 'user_vip_002'],
      weight: 2,
    },
    description: 'VIP users - 1000 burst with 50 refill per second',
  },
  {
    name: 'organization-policy',
    active: true,
    enabled: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    priority: 150,
    scope: 'org' as const,
    strategy: 'slidingWindow' as const,
    limit: 5000,
    windowSec: 300, // 5 minutes
    extra: {
      orgIds: ['org_enterprise_001', 'org_enterprise_002'],
    },
    description: 'Enterprise organizations - 5000 requests per 5 minutes',
  },
];

// Sample rate limit logs (for testing and monitoring)
const rateLimitLogsSeed = [
  {
    ip: '192.168.1.100',
    routeKey: 'GET:/api/v1/users',
    apiKey: 'ak_pro_abcdef1234567890',
    userId: 'user_456',
    orgId: 'org_001',
    allowed: true,
    policyName: 'api-read-heavy',
    strategy: 'tokenBucket' as const,
    currentCount: 15,
    limit: 200,
    windowSec: 60,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referer: 'https://example.com/dashboard',
    metadata: {
      responseTime: 150,
      cacheHit: true,
    },
  },
  {
    ip: '192.168.1.101',
    routeKey: 'POST:/api/v1/messages',
    apiKey: 'ak_free_1234567890abcdef',
    userId: 'user_123',
    allowed: true,
    policyName: 'api-create-message',
    strategy: 'tokenBucket' as const,
    currentCount: 3,
    limit: 20,
    windowSec: 60,
    userAgent: 'Mobile App v1.2.3',
    metadata: {
      messageType: 'text',
      priority: 'normal',
    },
  },
  {
    ip: '192.168.1.102',
    routeKey: 'POST:/api/v1/admin/users',
    apiKey: 'ak_whitelist_bypass_all_limits',
    userId: 'admin',
    allowed: true,
    policyName: 'admin-operations',
    strategy: 'tokenBucket' as const,
    currentCount: 1,
    limit: 50,
    windowSec: 60,
    userAgent: 'Admin Panel v2.0',
    metadata: {
      action: 'create_user',
      adminLevel: 'super',
    },
  },
  {
    ip: '192.168.1.103',
    routeKey: 'GET:/api/v1/analytics',
    apiKey: null, // Anonymous request
    allowed: false, // Rate limited
    policyName: 'global-default',
    strategy: 'fixedWindow' as const,
    currentCount: 101,
    limit: 100,
    windowSec: 60,
    retryAfter: 45,
    userAgent: 'Analytics Bot v1.0',
    metadata: {
      reason: 'rate_limit_exceeded',
      retryAfter: 45,
    },
  },
];

// Export all seed data
export const rateLimitSeed = {
  plans: plansSeed,
  apiKeys: apiKeysSeed,
  ipWhitelist: ipWhitelistSeed,
  rateLimitPolicies: rateLimitPoliciesSeed,
  rateLimitLogs: rateLimitLogsSeed,
};

// Export individual arrays for specific use cases
export {
  plansSeed,
  apiKeysSeed,
  ipWhitelistSeed,
  rateLimitPoliciesSeed,
  rateLimitLogsSeed,
};
