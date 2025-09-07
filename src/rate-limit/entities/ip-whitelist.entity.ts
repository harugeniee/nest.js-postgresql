import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * IP Whitelist entity for rate limiting
 * IPs in this table bypass all rate limits
 * Supports both individual IPs and CIDR ranges
 */
@Entity('ip_whitelist')
export class IpWhitelist {
  /**
   * Unique identifier for the whitelist entry
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * IP address or CIDR range
   * Examples: '192.168.1.1', '10.0.0.0/8', '::1'
   */
  @Index({ unique: true })
  @Column({ type: 'inet' })
  ip!: string;

  /**
   * Optional description for the whitelist entry
   * Useful for admin management and documentation
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  /**
   * Whether this whitelist entry is active
   * Inactive entries are ignored during rate limit checks
   */
  @Column('boolean', { default: true })
  active!: boolean;

  /**
   * Optional reason for whitelisting
   * Examples: 'internal-service', 'monitoring', 'admin'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  reason?: string;

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
   * Check if the whitelist entry is valid (active and not deleted)
   */
  isValid(): boolean {
    return this.active && !this.deletedAt;
  }
}
