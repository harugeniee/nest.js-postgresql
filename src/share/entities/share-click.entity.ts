import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { ShareLink } from './share-link.entity';
import { ShareSession } from './share-session.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Share click entity for tracking individual clicks on share links
 *
 * Features:
 * - Comprehensive click tracking with anti-fraud measures
 * - Links to share links and sessions
 * - Bot detection and deduplication
 * - Geographic and referrer tracking
 */
@Entity({ name: 'share_clicks' })
@Index(['shareId', 'ts'])
@Index(['sessionId'])
@Index(['event'])
@Index(['isCountable'])
@Index(['isBot'])
@Index(['ipHash'])
@Index(['uaHash'])
export class ShareClick extends BaseEntityCustom {
  /**
   * Foreign key reference to the share link
   * Maps to share_links.id
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to share_links.id',
  })
  shareId: string;

  @ManyToOne(() => ShareLink, { nullable: false })
  @JoinColumn({ name: 'shareId', referencedColumnName: 'id' })
  shareLink: ShareLink;

  /**
   * Optional foreign key reference to share session
   * Maps to share_sessions.id
   */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'Optional foreign key reference to share_sessions.id',
  })
  sessionId?: string;

  @ManyToOne(() => ShareSession, { nullable: true })
  @JoinColumn({ name: 'sessionId', referencedColumnName: 'id' })
  session?: ShareSession;

  /**
   * Click timestamp
   * Indexed for time-based queries
   */
  @Index()
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'Click timestamp',
  })
  ts: Date;

  /**
   * Event type: 'click' or 'prefetch'
   * Used to distinguish between actual clicks and prefetch requests
   */
  @Column({
    type: 'enum',
    enum: ['click', 'prefetch'],
    nullable: false,
    comment: 'Event type: click or prefetch',
  })
  event: 'click' | 'prefetch';

  /**
   * HTTP referrer header
   * Can be null for direct visits
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'HTTP referrer header',
  })
  referrer?: string;

  /**
   * User agent string
   * Used for bot detection and analytics
   */
  @Column({
    type: 'text',
    nullable: false,
    comment: 'User agent string',
  })
  userAgent: string;

  /**
   * Country code (ISO 3166-1 alpha-2)
   * Can be null if geolocation fails
   */
  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
    comment: 'Country code (ISO 3166-1 alpha-2)',
  })
  country?: string;

  /**
   * IP hash for deduplication and anti-fraud
   * SHA256 hash of (ip + userAgent + SECRET + YYYY-MM-DD)
   * Used for daily unique counting
   */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'IP hash for deduplication and anti-fraud',
  })
  ipHash: string;

  /**
   * User agent hash for deduplication
   * SHA256 hash of user agent string
   * Used for bot detection
   */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'User agent hash for deduplication',
  })
  uaHash: string;

  /**
   * Whether this click is from a bot
   * Determined by user agent analysis
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this click is from a bot',
  })
  isBot: boolean;

  /**
   * Whether this click should be counted in metrics
   * False for bots, prefetch requests, and self-clicks
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this click should be counted in metrics',
  })
  isCountable: boolean;
}
