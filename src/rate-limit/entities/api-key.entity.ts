import { COMMON_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Plan } from './plan.entity';

/**
 * API Key entity for rate limiting
 * Associates API keys with specific rate limit plans
 * Supports whitelist functionality for bypassing rate limits
 */
@Entity('api_keys')
export class ApiKey extends BaseEntityCustom {
  /**
   * The actual API key string
   * Should be hashed in production for security
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({
    type: 'enum',
    enum: COMMON_CONSTANTS.STATUS,
    default: COMMON_CONSTANTS.STATUS.ACTIVE,
  })
  status: string;

  /**
   * Whether this API key is currently active
   * Inactive keys are ignored during rate limit checks
   */
  @Column('boolean', { default: true })
  active!: boolean;

  /**
   * Whether this API key is whitelisted
   * Whitelisted keys bypass all rate limits
   */
  @Column({ type: 'boolean', default: false })
  isWhitelist!: boolean;

  /**
   * Optional name/description for the API key
   * Useful for admin management
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  /**
   * Optional owner/user identifier
   * Can be used to associate keys with specific users
   */
  @Column({ type: 'varchar', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Associated rate limit plan
   * Foreign key reference to plans.id
   */
  @Column({ nullable: true })
  planId?: string;

  /**
   * Associated rate limit plan
   */
  @ManyToOne(() => Plan, (plan) => plan.apiKeys, { nullable: true })
  @JoinColumn({ name: 'planId', referencedColumnName: 'id' })
  plan: Plan;

  /**
   * Last time this API key was used
   * Useful for monitoring and cleanup
   */
  @Index()
  @Column('timestamp', { nullable: true })
  lastUsedAt?: Date;

  /**
   * Expiration date for the API key
   * Optional - keys without expiration are permanent
   */
  @Index()
  @Column('timestamp', { nullable: true })
  expiresAt?: Date;

  /**
   * Check if the API key is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the API key is valid (active and not expired)
   */
  isValid(): boolean {
    return this.active && !this.isExpired() && !this.deletedAt;
  }
}
