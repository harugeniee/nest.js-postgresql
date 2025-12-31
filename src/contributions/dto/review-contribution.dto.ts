import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CONTRIBUTION_CONSTANTS } from 'src/shared/constants/contribution.constants';

/**
 * DTO for reviewing a contribution (approve or reject)
 * Used by admins to review and provide feedback on contributions
 */
export class ReviewContributionDto {
  /**
   * Optional admin notes about this contribution
   * Can be used for internal communication or feedback to contributor
   */
  @IsOptional()
  @IsString()
  @MaxLength(CONTRIBUTION_CONSTANTS.ADMIN_NOTES_MAX_LENGTH)
  adminNotes?: string;

  /**
   * Reason for rejection (required if rejecting)
   * Provides feedback to the contributor about why the contribution was rejected
   */
  @ValidateIf((o, v) => v !== undefined)
  @IsString()
  @MaxLength(CONTRIBUTION_CONSTANTS.REJECTION_REASON_MAX_LENGTH)
  rejectionReason?: string;
}
