import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportAction, ReportResolution } from 'src/shared/constants';

/**
 * DTO for resolving a report
 */
export class ResolveReportDto {
  @IsEnum(ReportAction)
  action: ReportAction;

  @IsEnum(ReportResolution)
  resolution: ReportResolution;

  @IsOptional()
  @IsString()
  resolutionDetails?: string;

  @IsOptional()
  @IsString()
  moderatorNotes?: string;
}
