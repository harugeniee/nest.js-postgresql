import { PartialType } from '@nestjs/swagger';
import { CreateArticleOrganizationDto } from './create-article-organization.dto';

/**
 * Update Article Organization DTO
 *
 * Data transfer object for updating article-organization associations
 * Extends CreateArticleOrganizationDto with all fields optional
 */
export class UpdateArticleOrganizationDto extends PartialType(
  CreateArticleOrganizationDto,
) {
  /**
   * Article ID to update
   * Optional field for updates
   */
  articleId?: string;

  /**
   * Organization ID to update
   * Optional field for updates
   */
  organizationId?: string;
}
