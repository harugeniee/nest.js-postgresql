import { instanceToPlain } from 'class-transformer';
import { CONTRIBUTION_CONSTANTS } from 'src/shared/constants/contribution.constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Contribution Entity
 *
 * Represents a user contribution request for creating or updating entities
 * (Series, Segments, Characters, Staff). Contributions require admin approval
 * before changes are applied to the database.
 */
@Entity('contributions')
@Index(['entityType', 'status']) // Composite index for filtering by entity type and status
@Index(['contributorId', 'status']) // Composite index for user's contributions
@Index(['status', 'createdAt']) // Composite index for pending contributions sorted by date
export class Contribution extends BaseEntityCustom {
  /**
   * Type of entity being contributed
   * Examples: 'series', 'segment', 'character', 'staff'
   */
  @Index() // Index for filtering by entity type
  @Column({
    type: 'varchar',
    length: CONTRIBUTION_CONSTANTS.ENTITY_TYPE_MAX_LENGTH,
    nullable: false,
  })
  entityType: string;

  /**
   * ID of the original entity (null if action is 'create')
   * Required for 'update' actions to identify which entity to update
   */
  @Index() // Index for filtering by entity ID
  @Column({ type: 'bigint', nullable: true })
  entityId?: string;

  /**
   * Type of action: 'create' or 'update'
   */
  @Column({
    type: 'varchar',
    length: CONTRIBUTION_CONSTANTS.ACTION_MAX_LENGTH,
    nullable: false,
  })
  action: string;

  /**
   * Proposed data changes (JSONB containing all new data)
   * This is the complete data structure that will be applied if approved
   */
  @Column({ type: 'jsonb', nullable: false })
  proposedData: Record<string, unknown>;

  /**
   * Original data snapshot (only present when action = 'update')
   * Used for comparison and conflict detection
   */
  @Column({ type: 'jsonb', nullable: true })
  originalData?: Record<string, unknown>;

  /**
   * Approval status: 'pending', 'approved', or 'rejected'
   */
  @Index() // Index for filtering by status
  @Column({
    type: 'varchar',
    length: CONTRIBUTION_CONSTANTS.STATUS_MAX_LENGTH,
    default: CONTRIBUTION_CONSTANTS.STATUS.PENDING,
    nullable: false,
  })
  status: string;

  /**
   * ID of the user who submitted this contribution
   */
  @Index() // Index for filtering by contributor
  @Column({ type: 'bigint', nullable: false })
  contributorId: string;

  /**
   * User who submitted this contribution
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'contributorId', referencedColumnName: 'id' })
  contributor: User;

  /**
   * ID of the admin who reviewed this contribution
   * Null until contribution is reviewed
   */
  @Column({ type: 'bigint', nullable: true })
  reviewerId?: string;

  /**
   * Admin who reviewed this contribution
   */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewerId', referencedColumnName: 'id' })
  reviewer?: User;

  /**
   * Reason for rejection (if status is 'rejected')
   * Provides feedback to the contributor about why the contribution was rejected
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  rejectionReason?: string;

  /**
   * Admin notes about this contribution
   * Can be used for internal communication or feedback to contributor
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  adminNotes?: string;

  /**
   * Optional note from the contributor
   * Allows contributors to provide context or explanation for their changes
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  contributorNote?: string;

  /**
   * Timestamp when the contribution was reviewed (approved or rejected)
   * Null until contribution is reviewed
   */
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  /**
   * Convert entity to JSON with proper serialization
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    return result;
  }
}
