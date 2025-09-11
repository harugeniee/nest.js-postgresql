import { IsOptional, IsString, IsNumber } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryReactionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  subjectType?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
