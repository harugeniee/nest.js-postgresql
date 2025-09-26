import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { ShareLink } from 'src/share/entities/share-link.entity';

/**
 * Share channel entity for categorizing share links
 *
 * Features:
 * - Channel categorization for different sharing platforms
 * - Optional channel for organizing share links
 * - One-to-many relationship with share links
 */
@Entity({ name: 'share_channels' })
@Index(['name'], { unique: true })
export class ShareChannel extends BaseEntityCustom {
  /**
   * Channel name (e.g., 'twitter', 'facebook', 'linkedin', 'email')
   * Must be unique across all channels
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Channel name for categorizing share links',
  })
  name: string;

  /**
   * Optional description of the channel
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Optional description of the channel',
  })
  description?: string;

  /**
   * Whether this channel is active
   * Defaults to true for new channels
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this channel is active',
  })
  isActive: boolean;

  /**
   * One-to-many relationship with share links
   * A channel can have multiple share links
   */
  @OneToMany(() => ShareLink, (shareLink) => shareLink.channel, {
    cascade: false,
    eager: false,
  })
  shareLinks?: ShareLink[];
}
