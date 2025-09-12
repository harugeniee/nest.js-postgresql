import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class BatchCountsDto {
  @IsString()
  subjectType: string;

  @IsArray()
  @IsString({ each: true })
  subjectIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kinds?: string[];
}
