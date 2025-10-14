import { IsString, IsUUID } from 'class-validator';

/**
 * Create Article Organization DTO
 *
 * Data transfer object for associating articles with organizations
 */
export class CreateArticleOrganizationDto {
  /**
   * Article ID to associate with the organization
   * Required field
   */
  @IsString()
  @IsUUID()
  articleId: string;

  /**
   * Organization ID to associate the article with
   * Required field
   */
  @IsString()
  @IsUUID()
  organizationId: string;
}
