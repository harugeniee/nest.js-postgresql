import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class BatchCountsDto {
  @IsString()
  subjectType: string;

  @IsArray()
  @IsNumber({}, { each: true })
  subjectIds: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kinds?: string[];
}
