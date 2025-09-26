import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { ShareLink } from 'src/share/entities/share-link.entity';
import { ShareClick } from 'src/share/entities/share-click.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

/**
 * Share session entity for tracking user sessions
 *
 * Features:
 * - Unique session tokens for tracking user sessions
 * - Links to share links
 * - Session expiration for security
 * - One-to-many relationship with clicks
 */
@Entity({ name: 'share_sessions' })
@Index(['sessionToken'], { unique: true })
@Index(['shareId'])
@Index(['expiresAt'])
export class ShareSession extends BaseEntityCustom {
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
   * Unique session token for tracking user sessions
   * Used in cookies and for attribution
   * Must be unique across all sessions
   */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'Unique session token for tracking user sessions',
  })
  sessionToken: string;

  /**
   * Session expiration date
   * Sessions expire after 7 days for attribution purposes
   */
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'Session expiration date',
  })
  expiresAt: Date;

  /**
   * One-to-many relationship with share clicks
   * A session can have multiple clicks
   */
  @OneToMany(() => ShareClick, (click) => click.session, {
    cascade: false,
    eager: false,
  })
  clicks?: ShareClick[];
}
