import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

/**
 * Analytics Metric Entity
 *
 * Stores aggregated metrics for performance optimization
 * Denormalized data for fast analytics queries
 */
@Entity('analytics_metrics')
@Index(['subjectType', 'subjectId'])
@Index(['dateKey'])
export class AnalyticsMetric extends BaseEntityCustom {
  /**
   * Type of metric being tracked
   * Examples: 'article_views', 'user_likes', 'comment_count'
   */
  @Column({ type: 'varchar', length: 50, nullable: false })
  metricType: string;

  /**
   * Type of subject the metric relates to
   * Examples: 'article', 'user', 'comment'
   */
  @Column({ type: 'varchar', length: 50, nullable: false })
  subjectType: string;

  /**
   * ID of the subject the metric relates to
   * Examples: article ID, user ID, comment ID
   */
  @Column({ type: 'bigint', nullable: false })
  subjectId: string;

  /**
   * Aggregated value for this metric
   * Incremented when events occur
   */
  @Column({ type: 'integer', default: 0 })
  metricValue: number;

  /**
   * Date key for daily aggregation (YYYY-MM-DD format)
   * Used for time-based analytics queries
   */
  @Column({ type: 'date', nullable: false })
  dateKey: string;
}
