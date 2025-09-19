import { IsString } from 'class-validator';

/**
 * DTO for dismissing a report
 */
export class DismissReportDto {
  @IsString()
  reason: string;
}
