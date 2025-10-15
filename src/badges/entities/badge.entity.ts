import {
  BADGE_CONSTANTS,
  BadgeCategory,
  BadgeRarity,
  BadgeStatus,
  BadgeType,
} from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BadgeAssignment } from './badge-assignment.entity';

/**
 * Badge entity representing different types of badges in the system
 * Similar to Discord's badge system with additional custom badges
 */
@Entity('badges')
@Index(['type'], { unique: true }) // Each badge type should be unique
@Index(['category', 'rarity']) // Composite index for filtering
@Index(['status', 'isVisible']) // Composite index for visibility filtering
@Index(['displayOrder']) // Index for ordering
export class Badge extends BaseEntityCustom {
  /**
   * Unique badge type identifier
   * Maps to BadgeType enum values
   */
  @Column({
    type: 'enum',
    enum: BadgeType,
    unique: true,
    nullable: false,
  })
  type!: BadgeType;

  /**
   * Badge name for display
   */
  @Column({
    type: 'varchar',
    length: BADGE_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name!: string;

  /**
   * Badge description
   */
  @Column({
    type: 'text',
    length: BADGE_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description?: string;

  /**
   * Badge category (common, paid, rare, etc.)
   */
  @Column({
    type: 'enum',
    enum: BadgeCategory,
    nullable: false,
  })
  category!: BadgeCategory;

  /**
   * Badge rarity level
   */
  @Column({
    type: 'enum',
    enum: BadgeRarity,
    nullable: false,
  })
  rarity!: BadgeRarity;

  /**
   * Badge status (active, inactive, hidden, discontinued)
   */
  @Column({
    type: 'enum',
    enum: BadgeStatus,
    default: BadgeStatus.ACTIVE,
    nullable: false,
  })
  status!: BadgeStatus;

  /**
   * Whether the badge is visible to users
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isVisible!: boolean;

  /**
   * Whether the badge is currently obtainable
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isObtainable!: boolean;

  /**
   * Display order for badge hierarchy (lower numbers appear first)
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
  })
  displayOrder!: number;

  /**
   * Icon URL for the badge
   */
  @Column({
    type: 'varchar',
    length: BADGE_CONSTANTS.ICON_URL_MAX_LENGTH,
    nullable: true,
  })
  iconUrl?: string;

  /**
   * Badge color in hex format (e.g., #FF0000)
   */
  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  color?: string;

  /**
   * Requirements to obtain this badge
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  requirements?: string;

  /**
   * Additional metadata for the badge (JSON format)
   * Can store custom properties like Discord-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, unknown>;

  /**
   * Whether this badge is automatically assigned
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  isAutoAssigned!: boolean;

  /**
   * Whether this badge can be manually assigned by admins
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isManuallyAssignable!: boolean;

  /**
   * Whether this badge can be revoked
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isRevokable!: boolean;

  /**
   * Expiration date for the badge (if applicable)
   * Some badges may have time limits
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  expiresAt?: Date;

  /**
   * Number of times this badge has been assigned
   * For statistics and analytics
   */
  @Column({
    type: 'int',
    default: 0,
    nullable: false,
  })
  assignmentCount!: number;

  /**
   * Badge assignments (polymorphic relationship)
   * One badge can be assigned to multiple entities
   */
  @OneToMany(() => BadgeAssignment, (assignment) => assignment.badge, {
    cascade: false,
    eager: false,
  })
  assignments?: BadgeAssignment[];

  /**
   * Get badge display name with fallback to type
   */
  getDisplayName(): string {
    return this.name || this.type;
  }

  /**
   * Check if badge is currently active and visible
   */
  isActive(): boolean {
    return this.status === BadgeStatus.ACTIVE && this.isVisible;
  }

  /**
   * Check if badge is expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if badge can be assigned
   */
  canBeAssigned(): boolean {
    return this.isActive() && this.isObtainable && !this.isExpired();
  }

  /**
   * Get badge rarity color (if not explicitly set)
   */
  getRarityColor(): string {
    if (this.color) {
      return this.color;
    }

    const rarityColors: Record<BadgeRarity, string> = {
      [BadgeRarity.COMMON]: '#9CA3AF', // Gray
      [BadgeRarity.UNCOMMON]: '#10B981', // Green
      [BadgeRarity.RARE]: '#3B82F6', // Blue
      [BadgeRarity.EPIC]: '#8B5CF6', // Purple
      [BadgeRarity.LEGENDARY]: '#F59E0B', // Orange
      [BadgeRarity.MYTHIC]: '#EF4444', // Red
    };

    return rarityColors[this.rarity] || '#9CA3AF';
  }

  /**
   * Increment assignment count
   */
  incrementAssignmentCount(): void {
    this.assignmentCount += 1;
  }

  /**
   * Decrement assignment count
   */
  decrementAssignmentCount(): void {
    this.assignmentCount = Math.max(0, this.assignmentCount - 1);
  }
}
