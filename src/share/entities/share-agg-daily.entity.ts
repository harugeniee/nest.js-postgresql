import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { ShareLink } from './share-link.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Share daily aggregation entity for storing daily metrics
 *
 * Features:
 * - Daily aggregated metrics for share links
 * - Clicks, uniques, conversions, and conversion value
 * - Optimized for reporting and analytics
 * - Links to share links
 */
@Entity({ name: 'share_agg_daily' })
@Index(['shareId', 'day'], { unique: true })
@Index(['shareId'])
@Index(['day'])
export class ShareAggDaily extends BaseEntityCustom {
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
   * Date for this aggregation (YYYY-MM-DD)
   * Indexed for time-based queries
   */
  @Column({
    type: 'date',
    nullable: false,
    comment: 'Date for this aggregation',
  })
  day: Date;

  /**
   * Total number of clicks for this day
   * Counted from share_clicks where isCountable = true
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of clicks for this day',
  })
  clicks: number;

  /**
   * Total number of unique visitors for this day
   * Counted from unique ipHash values in share_clicks
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of unique visitors for this day',
  })
  uniques: number;

  /**
   * Total number of conversions for this day
   * Counted from share_conversions where attributed = true
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
    comment: 'Total number of conversions for this day',
  })
  convs: number;

  /**
   * Total conversion value for this day
   * Sum of convValue from share_conversions where attributed = true
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: false,
    comment: 'Total conversion value for this day',
  })
  convValue: number;
}
