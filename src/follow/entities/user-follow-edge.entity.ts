import { BaseEntityCustom } from '../../shared/entities/base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

/**
 * UserFollowEdge Entity
 *
 * Stores individual follow relationships as edges
 * This serves as ground truth and audit trail for follow relationships
 * Used for rebuilding bitsets and maintaining consistency
 */
@Entity('user_follow_edges')
@Unique(['followerId', 'followeeId'])
@Index(['followerId'])
@Index(['followeeId'])
export class UserFollowEdge extends BaseEntityCustom {
  /**
   * ID of the user who is following
   * References users.id
   */
  @Column({ type: 'bigint' })
  followerId: string;

  /**
   * ID of the user being followed
   * References users.id
   */
  @Column({ type: 'bigint' })
  followeeId: string;

  /**
   * Status of the follow relationship
   * 'active' - currently following
   * 'deleted' - unfollowed
   * 'blocked' - blocked by either user
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'deleted' | 'blocked';

  /**
   * Source of the follow relationship
   * 'user' - user initiated follow
   * 'suggestion' - followed from suggestion
   * 'import' - imported from external source
   * 'admin' - admin created
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'user',
  })
  source: 'user' | 'suggestion' | 'import' | 'admin';

  /**
   * Additional metadata for the follow relationship
   * JSON field for storing context information
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Check if the relationship is currently active
   */
  isActive(): boolean {
    return this.status === 'active' && !this.deletedAt;
  }

  /**
   * Soft delete the relationship
   */
  softDelete(): void {
    this.status = 'deleted';
    this.deletedAt = new Date();
  }

  /**
   * Restore a deleted relationship
   */
  restore(): void {
    this.status = 'active';
    this.deletedAt = null;
  }

  /**
   * Block the relationship
   */
  block(): void {
    this.status = 'blocked';
    this.deletedAt = new Date();
  }
}
