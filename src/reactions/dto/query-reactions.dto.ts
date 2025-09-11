import { IsOptional, IsString, IsNumber } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryReactionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  subjectType?: string;

  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;
}
