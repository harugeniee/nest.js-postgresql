import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class BatchCommentsDto {
  @IsString()
  subjectType: string;

  @IsArray()
  @IsString({ each: true })
  subjectIds: string[];

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  includeReplies?: boolean = false;

  @IsOptional()
  @IsBoolean()
  includeAttachments?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeMentions?: boolean = true;

  @IsOptional()
  @IsString()
  visibility?: string = 'public';
}
