import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(ARTICLE_CONSTANTS.CONTENT_FORMAT)
  contentFormat?: (typeof ARTICLE_CONSTANTS.CONTENT_FORMAT)[keyof typeof ARTICLE_CONSTANTS.CONTENT_FORMAT];

  @IsOptional()
  @IsEnum(ARTICLE_CONSTANTS.VISIBILITY)
  visibility?: (typeof ARTICLE_CONSTANTS.VISIBILITY)[keyof typeof ARTICLE_CONSTANTS.VISIBILITY];

  @IsOptional()
  @IsEnum(ARTICLE_CONSTANTS.STATUS)
  status?: (typeof ARTICLE_CONSTANTS.STATUS)[keyof typeof ARTICLE_CONSTANTS.STATUS];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readTimeMinutes?: number;

  @IsString()
  @IsOptional()
  userId: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  scheduledAt?: Date;
}
