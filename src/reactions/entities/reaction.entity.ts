import { User } from 'src/users/entities/user.entity';
import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';

/**
 * Reaction Entity
 *
 * Stores user reactions/interactions with various objects like articles, comments, users, etc.
 * Examples: like article, bookmark comment, upvote user, etc.
 */
@Entity('reactions')
@Unique(['userId', 'subjectType', 'subjectId', 'kind'])
@Index(['subjectType', 'subjectId', 'kind'])
@Index(['userId'])
export class Reaction extends BaseEntityCustom {
  /**
   * ID of the user who performed the reaction
   * Links to users table
   */
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  /**
   * User information who performed the reaction
   * Many-to-One relationship with User entity
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  /**
   * Type of object being reacted to
   * Examples: 'article', 'comment', 'user', 'post', etc.
   * Maximum length: 32 characters
   */
  @Column({ type: 'varchar', length: 32, nullable: false })
  subjectType: string;

  /**
   * ID of the object being reacted to
   * Examples: article ID, comment ID, user ID, etc.
   */
  @Column({ type: 'bigint', nullable: false })
  subjectId: string;

  /**
   * Type of reaction
   * Examples: 'like', 'dislike', 'bookmark', 'upvote', 'downvote', 'clap', etc.
   * Maximum length: 24 characters
   */
  @Column({ type: 'varchar', length: 24, nullable: false })
  kind: string;
}
