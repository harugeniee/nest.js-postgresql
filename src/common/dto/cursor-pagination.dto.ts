import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class CursorPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}
