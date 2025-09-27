import { IsArray, IsString } from 'class-validator';

/**
 * DTO for merging duplicate reports
 */
export class MergeReportsDto {
  @IsArray()
  @IsString({ each: true })
  reportIds: string[];
}
