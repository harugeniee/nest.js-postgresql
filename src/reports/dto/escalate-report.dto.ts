import { IsString } from 'class-validator';

/**
 * DTO for escalating a report
 */
export class EscalateReportDto {
  @IsString()
  reason: string;
}
