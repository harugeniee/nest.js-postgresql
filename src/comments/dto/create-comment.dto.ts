import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  COMMENT_CONSTANTS,
  CommentFlag,
  CommentType,
  CommentVisibility,
} from 'src/shared/constants/comment.constants';

export class CreateCommentAttachmentDto {
  @IsString()
  mediaId: string;
}

export class CreateCommentMentionDto {
  @IsString()
  userId: string;

  @IsNumber()
  startIndex: number;

  @IsNumber()
  length: number;

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.MENTION_TYPES))
  type?: string = COMMENT_CONSTANTS.MENTION_TYPES.USER;

  @IsOptional()
  @IsBoolean()
  silent?: boolean = false;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class CreateCommentDto {
  @IsString()
  subjectType: string;

  @IsString()
  subjectId: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MinLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MIN_LENGTH)
  @MaxLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MAX_LENGTH)
  content: string;

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.TYPES))
  type?: CommentType = COMMENT_CONSTANTS.TYPES.TEXT;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean = false;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommentAttachmentDto)
  attachments?: CreateCommentAttachmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommentMentionDto)
  mentions?: CreateCommentMentionDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flags?: CommentFlag[];

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.VISIBILITY))
  visibility?: CommentVisibility = COMMENT_CONSTANTS.VISIBILITY.PUBLIC;
}
