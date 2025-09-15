import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  REPORT_CONSTANTS,
  ReportStatus,
  ReportPriority,
  ReportableType,
  ReportReason,
} from 'src/shared/constants';

/**
 * DTO for querying report statistics
 */
export class ReportStatsDto {
  @ApiPropertyOptional({
    description: 'Filter by report status',
    enum: REPORT_CONSTANTS.STATUS,
    example: 'pending',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.STATUS)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'Filter by report priority',
    enum: REPORT_CONSTANTS.PRIORITY,
    example: 'high',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.PRIORITY)
  priority?: ReportPriority;

  @ApiPropertyOptional({
    description: 'Filter by reportable type',
    enum: REPORT_CONSTANTS.REPORTABLE_TYPES,
    example: 'article',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.REPORTABLE_TYPES)
  reportableType?: ReportableType;

  @ApiPropertyOptional({
    description: 'Filter by report reason',
    enum: REPORT_CONSTANTS.REASONS,
    example: 'spam',
  })
  @IsOptional()
  @IsEnum(REPORT_CONSTANTS.REASONS)
  reason?: ReportReason;

  @ApiPropertyOptional({
    description: 'Filter by reporter ID',
    example: '1234567890123456789',
  })
  @IsOptional()
  @IsString()
  reporterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by moderator ID',
    example: '1234567890123456789',
  })
  @IsOptional()
  @IsString()
  moderatorId?: string;

  @ApiPropertyOptional({
    description: 'Start date for statistics period',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for statistics period',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Group statistics by time period',
    enum: ['hour', 'day', 'week', 'month', 'year'],
    example: 'day',
  })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month', 'year'])
  groupBy?: 'hour' | 'day' | 'week' | 'month' | 'year';
}
