import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  REPORT_CONSTANTS,
  ReportAction,
  ReportResolution,
} from 'src/shared/constants';

/**
 * DTO for resolving a report
 */
export class ResolveReportDto {
  @IsNotEmpty()
  @IsEnum(Object.values(REPORT_CONSTANTS.ACTIONS))
  action: ReportAction;

  @IsNotEmpty()
  @IsEnum(Object.values(REPORT_CONSTANTS.RESOLUTION))
  resolution: ReportResolution;

  @IsOptional()
  @IsString()
  resolutionDetails?: string;

  @IsOptional()
  @IsString()
  moderatorNotes?: string;
}
