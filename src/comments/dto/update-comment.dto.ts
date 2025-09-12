import {
  IsOptional,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  CreateCommentDto,
  CreateCommentAttachmentDto,
  CreateCommentMentionDto,
} from './create-comment.dto';
import {
  COMMENT_CONSTANTS,
  CommentVisibility,
} from 'src/shared/constants/comment.constants';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @IsOptional()
  @IsString()
  @MinLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MIN_LENGTH)
  @MaxLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MAX_LENGTH)
  content?: string;

  @IsOptional()
  @IsBoolean()
  edited?: boolean;

  @IsOptional()
  editedAt?: Date;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsString()
  visibility?: CommentVisibility;

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
}
