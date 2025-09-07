import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Rate limit policy entity
 * Defines flexible rate limiting rules with multiple strategies and scopes
 * Supports hot-reload with version control
 */
@Entity('rate_limit_policies')
export class RateLimitPolicy {
  /**
   * Unique identifier for the policy
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Policy name for easy reference
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  /**
   * Whether this policy is enabled
   */
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  /**
   * Priority level (higher number = higher priority)
   * Used to determine which policy to apply when multiple match
   */
  @Column({ type: 'int', default: 100 })
  priority!: number;

  /**
   * Scope of the policy
   * - global: applies to all requests
   * - route: applies to specific route patterns
   * - user: applies to specific users
   * - org: applies to specific organizations
   * - ip: applies to specific IP addresses
   */
  @Column({
    type: 'enum',
    enum: ['global', 'route', 'user', 'org', 'ip'],
    default: 'global',
  })
  scope!: 'global' | 'route' | 'user' | 'org' | 'ip';

  /**
   * Route pattern for route-scoped policies
   * Supports regex patterns, e.g., '^POST:/api/v1/messages$'
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  routePattern?: string;

  /**
   * Rate limiting strategy
   * - fixedWindow: simple counter with time window
   * - slidingWindow: smooth rate limiting with overlapping windows
   * - tokenBucket: burst-friendly with token refill
   */
  @Column({
    type: 'enum',
    enum: ['fixedWindow', 'slidingWindow', 'tokenBucket'],
    default: 'tokenBucket',
  })
  strategy!: 'fixedWindow' | 'slidingWindow' | 'tokenBucket';

  /**
   * Rate limit for fixed/sliding window strategies
   * Number of requests allowed per window
   */
  @Column({ type: 'int', nullable: true })
  limit?: number;

  /**
   * Time window in seconds for fixed/sliding window strategies
   */
  @Column({ type: 'int', nullable: true })
  windowSec?: number;

  /**
   * Burst capacity for token bucket strategy
   * Maximum number of tokens that can be stored
   */
  @Column({ type: 'int', nullable: true })
  burst?: number;

  /**
   * Token refill rate per second for token bucket strategy
   */
  @Column({ type: 'float', nullable: true })
  refillPerSec?: number;

  /**
   * Version number for hot-reload support
   * Incremented when policy is updated
   */
  @Column({ type: 'int', default: 1 })
  version!: number;

  /**
   * Additional configuration as JSON
   * Can include whitelist, user/org IDs, weight multipliers, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  extra?: {
    userIds?: string[];
    orgIds?: string[];
    ips?: string[];
    weight?: number;
    whitelist?: boolean;
    [key: string]: unknown;
  };

  /**
   * Policy description for admin interface
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Creation timestamp
   */
  @Index()
  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  /**
   * Last update timestamp
   */
  @Index()
  @Column('timestamp', {
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Soft delete timestamp
   */
  @Index()
  @Column('timestamp', { nullable: true })
  deletedAt?: Date;

  /**
   * Check if the policy is valid and active
   */
  isValid(): boolean {
    return this.enabled && !this.deletedAt;
  }

  /**
   * Check if the policy matches a given context
   */
  matches(context: {
    userId?: string;
    orgId?: string;
    ip?: string;
    routeKey?: string;
  }): boolean {
    if (!this.isValid()) return false;

    switch (this.scope) {
      case 'global':
        return true;
      case 'route':
        if (!this.routePattern || !context.routeKey) return false;
        try {
          const regex = new RegExp(this.routePattern);
          return regex.test(context.routeKey);
        } catch {
          return false;
        }
      case 'user':
        return this.extra?.userIds?.includes(context.userId || '') || false;
      case 'org':
        return this.extra?.orgIds?.includes(context.orgId || '') || false;
      case 'ip':
        return this.extra?.ips?.includes(context.ip || '') || false;
      default:
        return false;
    }
  }

  /**
   * Get effective rate limit parameters
   */
  getEffectiveParams(): {
    strategy: string;
    limit?: number;
    windowSec?: number;
    burst?: number;
    refillPerSec?: number;
  } {
    return {
      strategy: this.strategy,
      limit: this.limit,
      windowSec: this.windowSec,
      burst: this.burst,
      refillPerSec: this.refillPerSec,
    };
  }
}
