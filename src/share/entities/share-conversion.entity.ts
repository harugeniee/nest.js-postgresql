import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { ShareLink } from './share-link.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Share conversion entity for tracking conversions attributed to share links
 *
 * Features:
 * - Tracks various conversion types (subscribe, comment, follow_author, etc.)
 * - Optional conversion value for monetary conversions
 * - Attribution tracking with timestamps
 * - Links to share links and users
 */
@Entity({ name: 'share_conversions' })
@Index(['shareId'])
@Index(['viewerUserId'])
@Index(['convType'])
@Index(['occurredAt'])
@Index(['attributed'])
export class ShareConversion extends BaseEntityCustom {
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
   * Optional foreign key reference to the user who converted
   * Maps to users.id
   * Can be null for anonymous conversions
   */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'Optional foreign key reference to users.id',
  })
  viewerUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'viewerUserId', referencedColumnName: 'id' })
  viewer?: User;

  /**
   * Conversion type
   * Examples: 'subscribe', 'comment', 'follow_author', 'purchase', 'signup'
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Conversion type',
  })
  convType: string;

  /**
   * Optional conversion value
   * Used for monetary conversions or other numeric values
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Optional conversion value',
  })
  convValue?: number;

  /**
   * When the conversion occurred
   * Indexed for time-based queries
   */
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'When the conversion occurred',
  })
  occurredAt: Date;

  /**
   * Whether this conversion was attributed to the share link
   * Based on last-click attribution within 7 days
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this conversion was attributed to the share link',
  })
  attributed: boolean;
}
