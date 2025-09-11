/**
 * Example usage of slug utility functions in Article service
 *
 * This file demonstrates how to integrate slug generation
 * into your Article service for automatic slug creation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import {
  createSlug,
  createArticleSlug,
  generateUniqueSlug,
  isValidSlug,
  createTimestampedSlug,
} from 'src/common/utils/slug.util';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';

@Injectable()
export class ArticleSlugService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  /**
   * Create a new article with automatic slug generation
   *
   * @param articleData - Article data including title
   * @returns Created article with generated slug
   */
  async createArticleWithSlug(articleData: {
    title: string;
    content: string;
    authorId: string;
    summary?: string;
    contentFormat?: 'markdown' | 'html';
    visibility?: 'public' | 'unlisted' | 'private';
    status?: 'draft' | 'published' | 'archived';
    tags?: string[];
  }) {
    // Get existing slugs to avoid collisions
    const existingSlugs = await this.getExistingSlugs();

    // Generate unique slug from title
    const slug = createArticleSlug(articleData.title, existingSlugs, {
      maxLength: 80, // Shorter for articles
      separator: '-',
    });

    // Validate the generated slug
    if (!isValidSlug(slug, { minLength: 3, maxLength: 80 })) {
      throw new Error('Generated slug is invalid');
    }

    // Create article with generated slug
    const article = this.articleRepository.create({
      ...articleData,
      slug,
      // Set publishedAt if status is published
      publishedAt: articleData.status === 'published' ? new Date() : undefined,
    });

    return await this.articleRepository.save(article);
  }

  /**
   * Update article title and regenerate slug if needed
   *
   * @param articleId - ID of article to update
   * @param newTitle - New title for the article
   * @returns Updated article
   */
  async updateArticleTitle(articleId: string, newTitle: string) {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    // Generate new slug from new title
    const newSlug = createSlug(newTitle, { maxLength: 80 });

    // Check if slug has changed
    if (newSlug !== article.slug) {
      // Get existing slugs (excluding current article)
      const existingSlugs = await this.getExistingSlugs(articleId);

      // Generate unique slug
      const uniqueSlug = generateUniqueSlug(newSlug, existingSlugs, {
        maxLength: 80,
        separator: '-',
      });

      // Update article with new title and slug
      article.title = newTitle;
      article.slug = uniqueSlug;
      article.updatedAt = new Date();
    } else {
      // Just update title if slug remains the same
      article.title = newTitle;
      article.updatedAt = new Date();
    }

    return await this.articleRepository.save(article);
  }

  /**
   * Generate slug for existing article without saving
   * Useful for previewing slug before saving
   *
   * @param title - Article title
   * @param excludeArticleId - Article ID to exclude from uniqueness check
   * @returns Generated unique slug
   */
  async generateSlugPreview(
    title: string,
    excludeArticleId?: string,
  ): Promise<string> {
    const existingSlugs = await this.getExistingSlugs(excludeArticleId);
    return createArticleSlug(title, existingSlugs, { maxLength: 80 });
  }

  /**
   * Validate if a custom slug is available
   *
   * @param slug - Custom slug to validate
   * @param excludeArticleId - Article ID to exclude from check
   * @returns Object with validation result and suggestions
   */
  async validateCustomSlug(slug: string, excludeArticleId?: string) {
    // Validate slug format
    const isValid = isValidSlug(slug, { minLength: 3, maxLength: 80 });

    if (!isValid) {
      return {
        isValid: false,
        error:
          'Invalid slug format. Slug must contain only lowercase letters, numbers, and hyphens.',
        suggestion: createSlug(slug, { maxLength: 80 }),
      };
    }

    // Check if slug is available
    const existingArticle = await this.articleRepository.findOne({
      where: { slug },
    });

    if (existingArticle && existingArticle.id !== excludeArticleId) {
      const existingSlugs = await this.getExistingSlugs(excludeArticleId);
      const suggestedSlug = generateUniqueSlug(slug, existingSlugs, {
        maxLength: 80,
      });

      return {
        isValid: false,
        error: 'Slug already exists',
        suggestion: suggestedSlug,
      };
    }

    return {
      isValid: true,
      slug,
    };
  }

  /**
   * Create article with custom slug validation
   *
   * @param articleData - Article data
   * @param customSlug - Custom slug provided by user
   * @returns Created article with validated slug
   */
  async createArticleWithCustomSlug(
    articleData: {
      title: string;
      content: string;
      authorId: string;
      summary?: string;
      contentFormat?: 'markdown' | 'html';
      visibility?: 'public' | 'unlisted' | 'private';
      status?: 'draft' | 'published' | 'archived';
      tags?: string[];
    },
    customSlug: string,
  ) {
    // Validate custom slug
    const validation = await this.validateCustomSlug(customSlug);

    if (!validation.isValid) {
      throw new Error(
        `Invalid slug: ${validation.error}. Suggestion: ${validation.suggestion}`,
      );
    }

    // Create article with validated custom slug
    const article = this.articleRepository.create({
      ...articleData,
      slug: validation.slug,
      publishedAt: articleData.status === 'published' ? new Date() : undefined,
    });

    return await this.articleRepository.save(article);
  }

  /**
   * Generate timestamped slug for temporary or draft articles
   *
   * @param title - Article title
   * @returns Timestamped slug
   */
  generateTimestampedSlug(title: string): string {
    return createTimestampedSlug(title, {
      maxLength: 100,
      separator: '-',
      dateFormat: 'YYYYMMDD-HHMMSS',
    });
  }

  /**
   * Get all existing slugs from database
   *
   * @param excludeId - Article ID to exclude from results
   * @returns Array of existing slugs
   */
  private async getExistingSlugs(excludeId?: string): Promise<string[]> {
    const query = this.articleRepository
      .createQueryBuilder('article')
      .select('article.slug')
      .where('article.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('article.id != :excludeId', { excludeId });
    }

    const articles = await query.getMany();
    return articles.map((article) => article.slug);
  }

  /**
   * Example usage in controller
   */
  async exampleUsage() {
    // Example 1: Create article with auto-generated slug
    const article1 = await this.createArticleWithSlug({
      title: 'Xin chào thế giới! - Hướng dẫn NestJS',
      content: 'Nội dung bài viết...',
      authorId: '123456789',
      summary: 'Bài viết hướng dẫn về NestJS',
      contentFormat: ARTICLE_CONSTANTS.CONTENT_FORMAT.MARKDOWN,
      visibility: ARTICLE_CONSTANTS.VISIBILITY.PUBLIC,
      status: ARTICLE_CONSTANTS.STATUS.DRAFT,
      tags: ['nestjs', 'tutorial', 'vietnamese'],
    });
    console.log('Generated slug:', article1.slug); // 'xin-chao-the-gioi-huong-dan-nestjs'

    // Example 2: Update title and regenerate slug
    const updatedArticle = await this.updateArticleTitle(
      article1.id,
      'Xin chào thế giới! - Hướng dẫn NestJS cho người mới bắt đầu',
    );
    console.log('Updated slug:', updatedArticle.slug);

    // Example 3: Validate custom slug
    const validation = await this.validateCustomSlug('my-custom-slug');
    if (validation.isValid) {
      console.log('Slug is available:', validation.slug);
    } else {
      console.log('Slug not available, suggestion:', validation.suggestion);
    }

    // Example 4: Generate timestamped slug
    const timestampedSlug = this.generateTimestampedSlug('Draft Article');
    console.log('Timestamped slug:', timestampedSlug); // 'draft-article-20231201-143022'
  }
}
