import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  REPORT_CONSTANTS,
  ReportAction as ReportActionType,
} from 'src/shared/constants';

/**
 * DTO for creating a report action
 */
export class CreateReportActionDto {
  @ApiProperty({
    description: 'ID of the report this action belongs to',
    example: '1234567890123456789',
  })
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @ApiProperty({
    description: 'Type of action performed',
    enum: REPORT_CONSTANTS.ACTIONS,
    example: 'content_removed',
  })
  @IsEnum(REPORT_CONSTANTS.ACTIONS)
  @IsNotEmpty()
  action: ReportActionType;

  @ApiPropertyOptional({
    description: 'Description of the action taken',
    maxLength: 1000,
    example: 'Removed inappropriate content that violated community guidelines.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the action',
    maxLength: 2000,
    example: 'User was warned about future violations. Content was permanently removed.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the action',
    example: { 
      contentId: '1234567890123456789',
      userId: '9876543210987654321',
      reason: 'hate_speech'
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
