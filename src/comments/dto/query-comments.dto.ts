import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';

export class QueryCommentsDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  subjectType?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  edited?: boolean;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  includeReplies?: boolean = true;

  @IsOptional()
  @IsNumber()
  maxDepth?: number = 3;

  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeMentions?: boolean = true;
}

/**
 * DTO for querying comments with cursor pagination
 * Extends CursorPaginationDto to add comment-specific filters
 */
export class QueryCommentsCursorDto extends CursorPaginationDto {
  @IsOptional()
  @IsString()
  subjectType?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  edited?: boolean;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeMentions?: boolean = true;
}
