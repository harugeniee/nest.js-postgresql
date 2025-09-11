import { Entity, Column } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';

/**
 * Reaction Count Entity
 *
 * Stores denormalized reaction counts for performance optimization.
 * Instead of counting from reactions table every time, we store pre-calculated counts.
 */
@Entity('reaction_counts')
export class ReactionCount extends BaseEntityCustom {
  /**
   * Type of object being reacted to
   * Examples: 'article', 'comment', 'user', 'post', etc.
   * Maximum length: 32 characters
   */
  @Column({ type: 'varchar', length: 32 })
  subjectType: string;

  /**
   * ID of the object being reacted to
   * Examples: article ID, comment ID, user ID, etc.
   */
  @Column({ type: 'bigint' })
  subjectId: string;

  /**
   * Type of reaction
   * Examples: 'like', 'dislike', 'bookmark', 'upvote', 'downvote', 'clap', etc.
   * Maximum length: 24 characters
   */
  @Column({ type: 'varchar', length: 24 })
  kind: string;

  /**
   * Current count of reactions
   * Default: 0, updated when reactions are added or removed
   */
  @Column({ type: 'int', default: 0 })
  count: number;
}
