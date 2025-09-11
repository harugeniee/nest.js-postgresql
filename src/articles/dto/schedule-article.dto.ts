import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for scheduling an article for future publication
 */
export class ScheduleArticleDto {
  /**
   * Date and time when the article should be published
   * Must be in the future
   */
  @IsDateString()
  @Type(() => Date)
  scheduledAt: Date;

  /**
   * Optional custom slug for the article
   * If not provided, will be generated from title
   */
  @IsOptional()
  @IsString()
  customSlug?: string;
}

/**
 * DTO for rescheduling an article
 */
export class RescheduleArticleDto {
  /**
   * New date and time when the article should be published
   * Must be in the future
   */
  @IsDateString()
  @Type(() => Date)
  newScheduledAt: Date;
}

/**
 * DTO for updating article status
 */
export class UpdateArticleStatusDto {
  /**
   * New status for the article
   */
  @IsEnum(ARTICLE_CONSTANTS.STATUS)
  status: (typeof ARTICLE_CONSTANTS.STATUS)[keyof typeof ARTICLE_CONSTANTS.STATUS];

  /**
   * Scheduled date (required if status is 'scheduled')
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  scheduledAt?: Date;
}

/**
 * DTO for querying scheduled articles
 */
export class GetScheduledArticlesDto {
  /**
   * Maximum number of articles to return
   */
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  /**
   * Number of articles to skip
   */
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  /**
   * Start date for filtering scheduled articles
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  startDate?: Date;

  /**
   * End date for filtering scheduled articles
   */
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  endDate?: Date;
}
