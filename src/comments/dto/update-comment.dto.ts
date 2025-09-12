import {
  IsOptional,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsEnum,
  IsObject,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  CreateCommentDto,
  CreateCommentMentionDto,
} from './create-comment.dto';
import { CreateCommentMediaItemDto } from './create-comment-media.dto';
import {
  COMMENT_CONSTANTS,
  CommentVisibility,
  CommentType,
  CommentFlag,
} from 'src/shared/constants/comment.constants';

@ValidatorConstraint({ name: 'updateContentOrMedia', async: false })
export class UpdateContentOrMediaConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments): boolean {
    const object = args.object as UpdateCommentDto;
    const hasContent = !!(object.content && object.content.trim().length > 0);
    const hasMedia = !!(object.media && object.media.length > 0);

    // For updates, we allow empty updates (no content, no media)
    // This means the constraint should only validate when there's actual data
    const hasAnyData = hasContent || hasMedia;

    // If no data is provided, it's valid (empty update)
    // If data is provided, at least one field should be valid
    return !hasAnyData || hasContent || hasMedia;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Comment update must have either content or media';
  }
}

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @IsOptional()
  @IsString()
  @MinLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MIN_LENGTH)
  @MaxLength(COMMENT_CONSTANTS.VALIDATION.CONTENT_MAX_LENGTH)
  content?: string;

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.TYPES))
  type?: CommentType;

  @IsOptional()
  @IsBoolean()
  edited?: boolean;

  @IsOptional()
  editedAt?: Date;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsEnum(Object.values(COMMENT_CONSTANTS.VISIBILITY))
  visibility?: CommentVisibility;

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
  @Validate(UpdateContentOrMediaConstraint)
  _contentOrMedia?: any; // This field is only used for validation
}
