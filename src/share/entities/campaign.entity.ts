import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { ShareLink } from 'src/share/entities/share-link.entity';

/**
 * Campaign entity for organizing share links into marketing campaigns
 *
 * Features:
 * - Campaign categorization for marketing purposes
 * - Optional campaign for organizing share links
 * - One-to-many relationship with share links
 */
@Entity({ name: 'campaigns' })
@Index(['name'], { unique: true })
export class Campaign extends BaseEntityCustom {
  /**
   * Campaign name
   * Must be unique across all campaigns
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Campaign name for organizing share links',
  })
  name: string;

  /**
   * Optional description of the campaign
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Optional description of the campaign',
  })
  description?: string;

  /**
   * Campaign start date
   * Can be null for ongoing campaigns
   */
  @Index()
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Campaign start date',
  })
  startDate?: Date;

  /**
   * Campaign end date
   * Can be null for ongoing campaigns
   */
  @Index()
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Campaign end date',
  })
  endDate?: Date;

  /**
   * Whether this campaign is active
   * Defaults to true for new campaigns
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
    comment: 'Whether this campaign is active',
  })
  isActive: boolean;

  /**
   * One-to-many relationship with share links
   * A campaign can have multiple share links
   */
  @OneToMany(() => ShareLink, (shareLink) => shareLink.campaign, {
    cascade: false,
    eager: false,
  })
  shareLinks?: ShareLink[];
}
