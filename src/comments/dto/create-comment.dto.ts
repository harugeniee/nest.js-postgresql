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
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  COMMENT_CONSTANTS,
  CommentFlag,
  CommentType,
  CommentVisibility,
} from 'src/shared/constants/comment.constants';
import { CreateCommentMediaItemDto } from './create-comment-media.dto';

@ValidatorConstraint({ name: 'contentOrMedia', async: false })
export class ContentOrMediaConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const object = args.object as CreateCommentDto;
    const hasContent = !!(object.content && object.content.trim().length > 0);
    const hasMedia = !!(object.media && object.media.length > 0);

    return hasContent || hasMedia;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Comment must have either content or media';
  }
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

  @IsOptional()
  @IsString()
  @MinLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MIN_LENGTH)
  @MaxLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MAX_LENGTH)
  content?: string;

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.TYPES))
  type?: CommentType = COMMENT_CONSTANTS.TYPES.TEXT;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean = false;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  media?: CreateCommentMediaItemDto[];

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

  @Validate(ContentOrMediaConstraint)
  _contentOrMedia?: any; // This field is only used for validation
}
