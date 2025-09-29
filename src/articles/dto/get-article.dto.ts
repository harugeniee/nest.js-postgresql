import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { ARTICLE_CONSTANTS, ArticleVisibility } from 'src/shared/constants';

/**
 * Get Article DTO
 *
 * Data transfer object for get article query parameters
 * Extends AdvancedPaginationDto for pagination and filtering capabilities
 */
export class GetArticleDto extends AdvancedPaginationDto {
  /**
   * Event type filter - can be a single event type or comma-separated list
   * Examples: 'article_view' or 'article_view,user_follow,reaction_set'
   */
  @IsOptional()
  @IsString()
  @IsEnum(ARTICLE_CONSTANTS.VISIBILITY)
  visibility?: ArticleVisibility;
}
