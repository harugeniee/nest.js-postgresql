import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Plan } from './plan.entity';
import { RateLimitPolicy } from './rate-limit-policy.entity';

/**
 * Rate limit log entity
 * Tracks rate limit events for monitoring and analytics
 */
@Entity('rate_limit_logs')
export class RateLimitLog extends BaseEntityCustom {
  /**
   * IP address of the request
   */
  @Index()
  @Column({ type: 'varchar', length: 45 })
  ip!: string;

  /**
   * Route key (method:path)
   */
  @Index()
  @Column({ type: 'varchar', length: 255 })
  routeKey!: string;

  /**
   * API key used (if any)
   */
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  apiKey?: string;

  /**
   * User ID (if authenticated)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  userId?: string;

  /**
   * Organization ID (if applicable)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  orgId?: string;

  /**
   * Whether the request was allowed
   */
  @Column('boolean')
  allowed!: boolean;

  /**
   * Policy name used (if any)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  policyName?: string;

  /**
   * Rate limit strategy used
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  strategy?: string;

  /**
   * Current count when request was made
   */
  @Column('int', { default: 0 })
  currentCount!: number;

  /**
   * Rate limit applied
   */
  @Column('int', { default: 0 })
  limit!: number;

  /**
   * Time window in seconds
   */
  @Column('int', { default: 60 })
  windowSec!: number;

  /**
   * Retry after time in seconds (if rate limited)
   */
  @Column('int', { nullable: true })
  retryAfter?: number;

  /**
   * Request user agent
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * Request referer
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  referer?: string;

  /**
   * Additional metadata
   */
  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Associated rate limit plan
   */
  @Column({ nullable: true })
  planId?: string;

  /**
   * Associated rate limit plan
   */
  @ManyToOne(() => Plan, (plan) => plan.logs, { nullable: true })
  @JoinColumn({ name: 'planId', referencedColumnName: 'id' })
  plan?: Plan;

  /**
   * Associated rate limit policy
   */
  @Column({ nullable: true })
  policyId?: string;

  /**
   * Associated rate limit policy
   */
  @ManyToOne(() => RateLimitPolicy, (policy) => policy.logs, { nullable: true })
  @JoinColumn({ name: 'policyId', referencedColumnName: 'id' })
  policy?: RateLimitPolicy;
}
