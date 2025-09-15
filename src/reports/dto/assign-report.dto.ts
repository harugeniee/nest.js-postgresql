import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for assigning a report to a moderator
 */
export class AssignReportDto {
  @IsNotEmpty()
  @IsString()
  moderatorId: string;
}
