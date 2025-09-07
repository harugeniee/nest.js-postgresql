import { COMMON_CONSTANTS } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

/**
 * IP Whitelist entity for rate limiting
 * IPs in this table bypass all rate limits
 * Supports both individual IPs and CIDR ranges
 */
@Entity('ip_whitelist')
export class IpWhitelist extends BaseEntityCustom {
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

  @Column({
    type: 'enum',
    enum: COMMON_CONSTANTS.STATUS,
    default: COMMON_CONSTANTS.STATUS.ACTIVE,
  })
  status: string;

  /**
   * Optional reason for whitelisting
   * Examples: 'internal-service', 'monitoring', 'admin'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  reason?: string;

  /**
   * Check if the whitelist entry is valid (active and not deleted)
   */
  isValid(): boolean {
    return this.active && this.status === COMMON_CONSTANTS.STATUS.ACTIVE;
  }
}
