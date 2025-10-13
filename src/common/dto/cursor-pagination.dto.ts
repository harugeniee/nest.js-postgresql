import { IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from './advanced-pagination.dto';

export class CursorPaginationDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}
