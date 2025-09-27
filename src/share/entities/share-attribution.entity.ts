import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { ShareLink } from './share-link.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Share attribution entity for tracking user attributions to share links
 *
 * Features:
 * - Tracks which users were attributed to which share links
 * - First and last visit timestamps
 * - Total visit count for analytics
 * - Links to share links and users
 */
@Entity({ name: 'share_attributions' })
@Index(['shareId', 'viewerUserId'], { unique: true })
@Index(['shareId'])
@Index(['viewerUserId'])
@Index(['firstAt'])
@Index(['lastAt'])
export class ShareAttribution extends BaseEntityCustom {
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
   * Foreign key reference to the user who was attributed
   * Maps to users.id
   */
  @Column({
    type: 'bigint',
    nullable: false,
    comment: 'Foreign key reference to users.id',
  })
  viewerUserId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'viewerUserId', referencedColumnName: 'id' })
  viewer: User;

  /**
   * First visit timestamp
   * When the user first visited through this share link
   */
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'First visit timestamp',
  })
  firstAt: Date;

  /**
   * Last visit timestamp
   * When the user last visited through this share link
   */
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'Last visit timestamp',
  })
  lastAt: Date;

  /**
   * Total number of visits through this share link
   * Incremented on each visit
   */
  @Column({
    type: 'int',
    default: 1,
    nullable: false,
    comment: 'Total number of visits through this share link',
  })
  totalVisits: number;
}
