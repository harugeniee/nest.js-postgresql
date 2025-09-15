import { IsString } from 'class-validator';

/**
 * DTO for assigning a report to a moderator
 */
export class AssignReportDto {
  @IsString()
  moderatorId: string;
}
