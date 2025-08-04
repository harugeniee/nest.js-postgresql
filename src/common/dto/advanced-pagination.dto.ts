import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class AdvancedPaginationDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Transform(({ value }: { value: any }): string | string[] => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value as string | string[];
  })
  fields?: string | string[];

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  toDate?: Date;

  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  endTime?: Date;

  @IsOptional()
  @IsString()
  dateFilterField?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Transform(({ value }: { value: any }): string | string[] => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value as string | string[];
  })
  status?: string | string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Transform(({ value }: { value: any }): string | string[] => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value as string | string[];
  })
  ids?: string | string[];
}
