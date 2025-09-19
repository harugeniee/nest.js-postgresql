import { BaseEntityCustom } from '../../shared/entities/base.entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * UserFollowBitset Entity
 *
 * Stores roaring bitmap data for follow relationships
 * This is the primary storage for follow system using bitset approach
 */
@Entity('user_follow_bitset')
@Index(['userId'], { unique: true })
@Index(['lastRebuildAt'])
export class UserFollowBitset extends BaseEntityCustom {
  /**
   * User ID - Primary key
   * References users.id
   */
  @PrimaryColumn({ type: 'bigint' })
  userId: string;

  /**
   * Number of users this user is following
   * Cached counter for performance
   */
  @Column({ type: 'int', default: 0 })
  followingCount: number;

  /**
   * Number of users following this user
   * Cached counter for performance
   */
  @Column({ type: 'int', default: 0 })
  followerCount: number;

  /**
   * Serialized roaring bitmap for "following" relationships
   * Contains user IDs that this user follows
   */
  @Column({ type: 'bytea', nullable: true })
  followingRb: Buffer;

  /**
   * Serialized roaring bitmap for "followers" relationships
   * Contains user IDs that follow this user
   * Optional - can be built asynchronously
   */
  @Column({ type: 'bytea', nullable: true })
  followersRb: Buffer;

  /**
   * Timestamp when the bitset was last rebuilt from edges
   * Used for consistency checks and rebuild scheduling
   */
  @Column({ type: 'timestamp', nullable: true })
  lastRebuildAt: Date;

  /**
   * Timestamp when the bitset was last persisted to database
   * Used for persistence scheduling
   */
  @Column({ type: 'timestamp', nullable: true })
  lastPersistedAt: Date;

  /**
   * Metadata for debugging and monitoring
   * JSON field for storing additional information
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Check if the bitset needs rebuilding
   * @param maxAgeHours Maximum age in hours before rebuild is needed
   */
  needsRebuild(maxAgeHours: number = 24): boolean {
    if (!this.lastRebuildAt) return true;
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    return Date.now() - this.lastRebuildAt.getTime() > maxAge;
  }

  /**
   * Check if the bitset needs persistence
   * @param maxAgeMinutes Maximum age in minutes before persistence is needed
   */
  needsPersistence(maxAgeMinutes: number = 5): boolean {
    if (!this.lastPersistedAt) return true;
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    return Date.now() - this.lastPersistedAt.getTime() > maxAge;
  }

  /**
   * Update rebuild timestamp
   */
  markRebuilt(): void {
    this.lastRebuildAt = new Date();
  }

  /**
   * Update persistence timestamp
   */
  markPersisted(): void {
    this.lastPersistedAt = new Date();
  }
}
