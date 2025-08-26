import {
  QrActionType,
  QR_ACTION_TYPES,
  QrTicketStatus,
  QR_TICKET_STATUSES,
} from 'src/shared/constants/qr.constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * QR Ticket Entity - Represents a QR code ticket for various actions
 * This entity stores information about QR code generation, scanning, and approval
 */
@Entity({
  name: 'qr_tickets',
})
@Index(['status', 'expiresAt'])
@Index(['type', 'status'])
@Index(['createdById', 'status'])
@Index(['scannedById', 'status'])
export class QrTicket extends BaseEntityCustom {
  /** Type of action this ticket represents */
  @Column({
    type: 'enum',
    enum: QR_ACTION_TYPES,
    comment: 'Type of action this ticket represents',
  })
  type: QrActionType;

  /** Current status of the ticket */
  @Column({
    type: 'enum',
    enum: QR_TICKET_STATUSES,
    default: QR_TICKET_STATUSES.PENDING,
    comment: 'Current status of the ticket',
  })
  status: QrTicketStatus;

  /** PKCE code challenge (base64url encoded SHA256 hash of code verifier) */
  @Column({
    type: 'varchar',
    length: 128,
    comment:
      'PKCE code challenge (base64url encoded SHA256 hash of code verifier)',
  })
  codeChallenge: string;

  /** Optional web session identifier to bind the ticket to a specific browser session */
  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    comment:
      'Optional web session identifier to bind the ticket to a specific browser session',
  })
  webSessionId?: string;

  /** Additional data specific to the action type */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional data specific to the action type',
  })
  payload?: Record<string, unknown>;

  /** User ID who created the ticket (if applicable) */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'User ID who created the ticket (if applicable)',
  })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById', referencedColumnName: 'id' })
  createdBy: User;

  /** User ID who scanned the QR code */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'User ID who scanned the QR code',
  })
  scannedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'scannedById', referencedColumnName: 'id' })
  scannedBy: User;

  /** User ID who approved the action */
  @Column({
    type: 'bigint',
    nullable: true,
    comment: 'User ID who approved the action',
  })
  approvedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById', referencedColumnName: 'id' })
  approvedBy: User;

  /** Timestamp when the ticket expires (Unix timestamp in milliseconds) */
  @Column({
    type: 'bigint',
    comment:
      'Timestamp when the ticket expires (Unix timestamp in milliseconds)',
  })
  expiresAt: number;

  /** Timestamp when the QR was scanned (Unix timestamp in milliseconds) */
  @Column({
    type: 'bigint',
    nullable: true,
    comment:
      'Timestamp when the QR was scanned (Unix timestamp in milliseconds)',
  })
  scannedAt?: number;

  /** Timestamp when the action was approved (Unix timestamp in milliseconds) */
  @Column({
    type: 'bigint',
    nullable: true,
    comment:
      'Timestamp when the action was approved (Unix timestamp in milliseconds)',
  })
  approvedAt?: number;

  /**
   * Check if the ticket has expired
   * @returns True if the ticket has expired, false otherwise
   */
  isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }

  /**
   * Check if the ticket can be scanned
   * @returns True if the ticket can be scanned, false otherwise
   */
  canBeScanned(): boolean {
    return this.status === QR_TICKET_STATUSES.PENDING && !this.isExpired();
  }

  /**
   * Check if the ticket can be approved
   * @returns True if the ticket can be approved, false otherwise
   */
  canBeApproved(): boolean {
    return this.status === QR_TICKET_STATUSES.SCANNED && !this.isExpired();
  }

  /**
   * Mark the ticket as scanned
   * @param userId - ID of the user who scanned the QR code
   */
  markAsScanned(userId: string): void {
    this.status = QR_TICKET_STATUSES.SCANNED;
    this.scannedById = userId;
    this.scannedAt = Date.now();
  }

  /**
   * Mark the ticket as approved
   * @param userId - ID of the user who approved the action
   */
  markAsApproved(userId: string): void {
    this.status = QR_TICKET_STATUSES.APPROVED;
    this.approvedById = userId;
    this.approvedAt = Date.now();
  }

  /**
   * Mark the ticket as expired
   */
  markAsExpired(): void {
    this.status = QR_TICKET_STATUSES.EXPIRED;
  }

  /**
   * Mark the ticket as cancelled
   */
  markAsCancelled(): void {
    this.status = QR_TICKET_STATUSES.REJECTED;
  }
}
