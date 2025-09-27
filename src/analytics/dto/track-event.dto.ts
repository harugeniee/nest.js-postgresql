import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Track Event DTO
 *
 * Data transfer object for tracking analytics events
 */
export class TrackEventDto {
  /**
   * Type of event being tracked
   * Examples: 'article_view', 'user_follow', 'reaction_set'
   */
  @IsString()
  eventType: string;

  /**
   * Category of the event for grouping
   * Examples: 'user', 'content', 'engagement', 'system'
   */
  @IsString()
  eventCategory: string;

  /**
   * Type of subject the event relates to
   * Examples: 'article', 'comment', 'user', 'reaction'
   */
  @IsOptional()
  @IsString()
  subjectType?: string;

  /**
   * ID of the subject the event relates to
   * Examples: article ID, comment ID, user ID
   */
  @IsOptional()
  @IsString()
  subjectId?: string;

  /**
   * Additional event data
   * Can include custom properties, metadata, etc.
   */
  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;
}
