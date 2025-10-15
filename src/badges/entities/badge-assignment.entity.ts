import { BadgeAssignmentStatus, BadgeEntityType } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Badge } from './badge.entity';

/**
 * BadgeAssignment entity for polymorphic badge assignments
 * Allows badges to be assigned to any entity type (user, article, comment, etc.)
 */
@Entity('badge_assignments')
@Index(['entityType', 'entityId']) // Composite index for entity lookups
@Index(['badgeId', 'entityType', 'entityId'], { unique: true }) // Unique constraint per badge per entity
@Index(['status', 'assignedAt']) // Composite index for status filtering
@Index(['expiresAt']) // Index for expiration queries
export class BadgeAssignment extends BaseEntityCustom {
  /**
   * Reference to the badge being assigned
   */
  @Column({
    type: 'bigint',
    nullable: false,
  })
  badgeId!: string;

  /**
   * Type of entity this badge is assigned to
   */
  @Column({
    type: 'enum',
    enum: BadgeEntityType,
    nullable: false,
  })
  entityType!: BadgeEntityType;

  /**
   * ID of the entity this badge is assigned to
   */
  @Column({
    type: 'bigint',
    nullable: false,
  })
  entityId!: string;

  /**
   * Status of the badge assignment
   */
  @Column({
    type: 'enum',
    enum: BadgeAssignmentStatus,
    default: BadgeAssignmentStatus.ACTIVE,
    nullable: false,
  })
  status!: BadgeAssignmentStatus;

  /**
   * When the badge was assigned
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  assignedAt!: Date;

  /**
   * When the badge assignment expires (if applicable)
   * Some badges may have time limits
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  expiresAt?: Date;

  /**
   * When the badge was revoked (if applicable)
   */
  @Column({
    type: 'timestamp',
    nullable: true,
  })
  revokedAt?: Date;

  /**
   * ID of the user who assigned this badge
   * Can be null for system-assigned badges
   */
  @Column({
    type: 'bigint',
    nullable: true,
  })
  assignedBy?: string;

  /**
   * ID of the user who revoked this badge
   * Can be null for system-revoked badges
   */
  @Column({
    type: 'bigint',
    nullable: true,
  })
  revokedBy?: string;

  /**
   * Reason for assignment (optional)
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  assignmentReason?: string;

  /**
   * Reason for revocation (optional)
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  revocationReason?: string;

  /**
   * Additional metadata for the assignment (JSON format)
   * Can store custom properties like Discord-specific data
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, unknown>;

  /**
   * Whether this assignment is visible to the entity owner
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isVisible!: boolean;

  /**
   * Whether this assignment can be manually revoked
   */
  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isManuallyRevokable!: boolean;

  /**
   * Badge entity (many-to-one relationship)
   */
  @ManyToOne(() => Badge, (badge) => badge.assignments, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'badgeId', referencedColumnName: 'id' })
  badge?: Badge;

  /**
   * Get the entity identifier string
   * Format: "entityType:entityId"
   */
  getEntityIdentifier(): string {
    return `${this.entityType}:${this.entityId}`;
  }

  /**
   * Check if the assignment is currently active
   */
  isActive(): boolean {
    return this.status === BadgeAssignmentStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Check if the assignment is expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if the assignment is revoked
   */
  isRevoked(): boolean {
    return this.status === BadgeAssignmentStatus.REVOKED;
  }

  /**
   * Check if the assignment is suspended
   */
  isSuspended(): boolean {
    return this.status === BadgeAssignmentStatus.SUSPENDED;
  }

  /**
   * Get the duration of the assignment in milliseconds
   */
  getDuration(): number | null {
    if (!this.assignedAt) {
      return null;
    }

    const endTime = this.revokedAt || this.expiresAt || new Date();
    return endTime.getTime() - this.assignedAt.getTime();
  }

  /**
   * Get the time remaining until expiration in milliseconds
   * Returns null if no expiration or already expired
   */
  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt) {
      return null;
    }

    const now = new Date();
    if (this.expiresAt <= now) {
      return 0;
    }

    return this.expiresAt.getTime() - now.getTime();
  }

  /**
   * Revoke the assignment
   */
  revoke(revokedBy?: string, reason?: string): void {
    this.status = BadgeAssignmentStatus.REVOKED;
    this.revokedAt = new Date();
    this.revokedBy = revokedBy;
    this.revocationReason = reason;
  }

  /**
   * Suspend the assignment
   */
  suspend(suspendedBy?: string, reason?: string): void {
    this.status = BadgeAssignmentStatus.SUSPENDED;
    this.revokedBy = suspendedBy;
    this.revocationReason = reason;
  }

  /**
   * Reactivate the assignment
   */
  reactivate(): void {
    this.status = BadgeAssignmentStatus.ACTIVE;
    this.revokedAt = undefined;
    this.revokedBy = undefined;
    this.revocationReason = undefined;
  }

  /**
   * Set expiration date
   */
  setExpiration(expiresAt: Date): void {
    this.expiresAt = expiresAt;
  }

  /**
   * Clear expiration date
   */
  clearExpiration(): void {
    this.expiresAt = undefined;
  }
}
