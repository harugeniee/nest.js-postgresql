import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { RateLimitLog } from './rate-limit-log.entity';

/**
 * Rate limit plan entity
 * Defines different rate limiting tiers (anonymous, free, pro, enterprise)
 * Each plan has specific limits and TTL configurations
 */
@Entity('plans')
export class Plan extends BaseEntityCustom {
  /**
   * Plan name - serves as primary key
   * Examples: 'anonymous', 'free', 'pro', 'enterprise'
   */
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  /**
   * Rate limit per minute for this plan
   * Defines how many requests are allowed per minute
   */
  @Column('int')
  limitPerMin!: number;

  /**
   * Time-to-live in seconds for rate limit counters
   * Default: 60 seconds (1 minute)
   */
  @Column('int', { default: 60 })
  ttlSec!: number;

  /**
   * Additional configuration as JSON
   * Can store extra settings like burst limits, special rules, etc.
   */
  @Column('jsonb', { nullable: true })
  extra?: Record<string, unknown>;

  /**
   * Plan description for admin interface
   */
  @Column('text', { nullable: true })
  description?: string;

  /**
   * Whether this plan is active and available for assignment
   */
  @Column('boolean', { default: true })
  active!: boolean;

  /**
   * Display order for admin interface
   */
  @Column('int', { default: 0 })
  displayOrder!: number;

  /**
   * API keys associated with this plan
   */
  @OneToMany(() => ApiKey, (apiKey) => apiKey.planId)
  apiKeys?: ApiKey[];

  /**
   * Rate limit logs for this plan
   */
  @OneToMany(() => RateLimitLog, (log) => log.planId)
  logs?: RateLimitLog[];
}
