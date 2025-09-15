import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateReportDto } from './create-report.dto';
import {
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import {
  REPORT_CONSTANTS,
  ReportStatus,
  ReportPriority,
  ReportAction,
  ReportResolution,
} from 'src/shared/constants';

/**
 * DTO for updating a report
 */
export class UpdateReportDto extends PartialType(CreateReportDto) {
  @ApiPropertyOptional({
    description: 'Current status of the report',
    enum: REPORT_CONSTANTS.STATUS,
    example: 'under_review',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.STATUS)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'Priority level of the report',
    enum: REPORT_CONSTANTS.PRIORITY,
    example: 'high',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.PRIORITY)
  priority?: ReportPriority;

  @ApiPropertyOptional({
    description: 'ID of the moderator assigned to review this report',
    example: '1234567890123456789',
  })
  @IsOptional()
  @IsString()
  moderatorId?: string;

  @ApiPropertyOptional({
    description: 'Action taken by the moderator',
    enum: REPORT_CONSTANTS.ACTIONS,
    example: 'content_removed',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.ACTIONS)
  action?: ReportAction;

  @ApiPropertyOptional({
    description: 'Notes from the moderator about the report',
    maxLength: REPORT_CONSTANTS.MODERATOR_NOTES_MAX_LENGTH,
    example: 'Content violates community guidelines. Removed and user warned.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REPORT_CONSTANTS.MODERATOR_NOTES_MAX_LENGTH)
  moderatorNotes?: string;

  @ApiPropertyOptional({
    description: 'Resolution of the report',
    enum: REPORT_CONSTANTS.RESOLUTION,
    example: 'resolved',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.RESOLUTION)
  resolution?: ReportResolution;

  @ApiPropertyOptional({
    description: 'Additional details about the resolution',
    maxLength: REPORT_CONSTANTS.RESOLUTION_MAX_LENGTH,
    example: 'Content removed and user received warning. No further action needed.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REPORT_CONSTANTS.RESOLUTION_MAX_LENGTH)
  resolutionDetails?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the report was assigned to a moderator',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the report was resolved',
    example: '2024-01-15T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  resolvedAt?: Date;
}
