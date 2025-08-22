import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { PaginationDto } from './pagination.dto';

export class AdvancedPaginationDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  @Transform(({ value }: { value: string }): string | string[] => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    return value as string | string[];
  })
  fields?: string | string[];

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  caseSensitive?: number;

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
  @Transform(({ value }: { value: string }): string | string[] => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    return value as string | string[];
  })
  status?: string | string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Transform(({ value }: { value: string }): string | string[] => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    return value as string | string[];
  })
  ids?: string | string[];

  @IsOptional()
  @IsString()
  userId?: string;
}
