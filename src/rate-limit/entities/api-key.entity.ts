import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * API Key entity for rate limiting
 * Associates API keys with specific rate limit plans
 * Supports whitelist functionality for bypassing rate limits
 */
@Entity('api_keys')
export class ApiKey {
  /**
   * Unique identifier for the API key
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The actual API key string
   * Should be hashed in production for security
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  /**
   * Associated rate limit plan
   * Foreign key reference to plans.name
   */
  @Column({ type: 'varchar', length: 64 })
  plan!: string;

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
  @Column({ name: 'is_whitelist', type: 'boolean', default: false })
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
  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerId?: string;

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
