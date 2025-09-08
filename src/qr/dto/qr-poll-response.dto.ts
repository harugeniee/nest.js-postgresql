import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { QrTicketStatus } from 'src/shared/constants';

/**
 * DTO for QR ticket polling responses
 * This DTO is used for both short-poll and long-poll endpoints
 */
export class QrPollResponseDto {
  /** The ticket ID */
  @IsString()
  tid: string;

  /** Current status of the ticket */
  @IsString()
  status: QrTicketStatus;

  /** ISO timestamp when the ticket expires */
  @IsString()
  expiresAt: string;

  /** ISO timestamp when the ticket was scanned (if applicable) */
  @IsOptional()
  @IsString()
  scannedAt?: string;

  /** ISO timestamp when the ticket was approved (if applicable) */
  @IsOptional()
  @IsString()
  approvedAt?: string;

  /** ISO timestamp when the ticket was rejected (if applicable) */
  @IsOptional()
  @IsString()
  rejectedAt?: string;

  /** ISO timestamp when the ticket was used (if applicable) */
  @IsOptional()
  @IsString()
  usedAt?: string;

  /** Whether the grant is ready and deliveryCode is available for this webSessionId */
  @IsBoolean()
  grantReady: boolean;

  /** One-time delivery code for grant exchange (only when grantReady=true and webSessionId matches) */
  @IsOptional()
  @IsString()
  deliveryCode?: string;

  /** Suggested interval in milliseconds for next poll (for short-poll) */
  @IsNumber()
  nextPollAfterMs: number;

  /** Version number for ETag support (increments on status changes) */
  @IsNumber()
  version: number;
}
