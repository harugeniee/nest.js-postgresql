import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { createArticleSlug } from 'src/common/utils/slug.util';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsWhere,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { CreateArticleDto } from './dto/create-article.dto';
import {
  RescheduleArticleDto,
  ScheduleArticleDto,
  UpdateArticleStatusDto,
} from './dto/schedule-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ArticlesService extends BaseService<Article> {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly scheduledPublishingService: ScheduledPublishingService,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Article>(articleRepository),
      {
        entityName: 'Article',
        cache: { enabled: true, ttlSec: 60, prefix: 'articles', swrSec: 30 },
        defaultSearchField: 'title',
        relationsWhitelist: {
          user: true,
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Article)[] {
    return ['title', 'summary', 'content'];
  }

  protected async beforeCreate(
    data: DeepPartial<Article>,
  ): Promise<DeepPartial<Article>> {
    // Get existing slugs to avoid collisions
    const existingSlugs = await this.getExistingSlugs();

    // Generate unique slug from title
    const title = data.title;

    if (!title) {
      return data;
    }

    const slug = createArticleSlug(title, existingSlugs, {
      maxLength: 80,
      separator: '-',
    });

    return {
      ...data,
      slug,
      // Set publishedAt if status is published
      publishedAt: data.status === 'published' ? new Date() : undefined,
    };
  }

  /**
   * Create a new article
   *
   * @param createArticleDto - Article data
   * @returns Created article
   */
  async createArticle(createArticleDto: CreateArticleDto): Promise<Article> {
    // Use tagsArray field for backward compatibility with string[] tags
    const articleData: DeepPartial<Article> = {
      ...createArticleDto,
      // Store tags as string array in tagsArray field
      tagsArray: createArticleDto.tags,
      // Don't set tags relationship - it will be handled separately if needed
      tags: undefined,
    };

    return await this.create(articleData);
  }

  /**
   * Update an article
   *
   * @param id - Article ID
   * @param updateArticleDto - Update data
   * @returns Updated article
   */
  async updateArticle(
    id: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    // Use tagsArray field for backward compatibility with string[] tags
    const articleData: DeepPartial<Article> = {
      ...updateArticleDto,
      // Store tags as string array in tagsArray field
      tagsArray: updateArticleDto.tags,
      // Don't set tags relationship - it will be handled separately if needed
      tags: undefined,
    };

    return await super.update(id, articleData);
  }

  /**
   * Get all articles with optional filtering
   *
   * @param paginationDto - Pagination parameters
   * @returns Paginated articles
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Article>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all articles with cursor pagination
   *
   * @param paginationDto - Cursor pagination parameters
   * @returns Cursor paginated articles
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Article>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get a single article by ID
   *
   * @param id - Article ID
   * @returns Article or throws NotFoundException
   */
  async findById(id: string): Promise<Article> {
    return await super.findById(id, { relations: ['user'] });
  }

  /**
   * Get a single article by slug
   *
   * @param slug - Article slug
   * @returns Article or throws NotFoundException
   */
  async findBySlug(slug: string): Promise<Article> {
    const article = await super.findOne({ slug }, { relations: ['user'] });
    if (!article) {
      throw new HttpException(
        { messageKey: 'article.NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }
    return article;
  }

  protected async beforeUpdate(
    id: string,
    patch: DeepPartial<Article>,
  ): Promise<void> {
    // If title is being updated, regenerate slug
    if (patch.title && typeof patch.title === 'string') {
      const article = await super.findById(id);
      if (patch.title !== article.title) {
        const existingSlugs = await this.getExistingSlugs(id);
        const title = patch.title || '';
        const newSlug = createArticleSlug(title, existingSlugs, {
          maxLength: 80,
          separator: '-',
        });
        patch.slug = newSlug;
      }
    }
  }

  /**
   * Soft delete an article
   *
   * @param id - Article ID
   * @returns Deleted article
   */
  async remove(id: string): Promise<void> {
    return await this.softDelete(id);
  }

  /**
   * Schedule an article for future publication
   *
   * @param id - Article ID
   * @param scheduleDto - Scheduling data
   * @returns Scheduled article
   */
  async scheduleArticle(
    id: string,
    scheduleDto: ScheduleArticleDto,
  ): Promise<Article> {
    const article = await this.findById(id);

    // If custom slug is provided, update it
    if (scheduleDto.customSlug) {
      const existingSlugs = await this.getExistingSlugs(id);
      const validation = await this.validateCustomSlug(
        scheduleDto.customSlug,
        existingSlugs,
      );

      if (!validation.isValid) {
        throw new HttpException(
          {
            messageKey:
              validation.error === 'Invalid slug format'
                ? 'article.INVALID_SLUG'
                : 'article.SLUG_ALREADY_EXISTS',
            suggestion: validation.suggestion,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      article.slug = validation.slug || '';
    }

    // Schedule the article
    return await this.scheduledPublishingService.scheduleArticle(
      id,
      scheduleDto.scheduledAt,
    );
  }

  /**
   * Reschedule an article
   *
   * @param id - Article ID
   * @param rescheduleDto - Rescheduling data
   * @returns Rescheduled article
   */
  async rescheduleArticle(
    id: string,
    rescheduleDto: RescheduleArticleDto,
  ): Promise<Article> {
    return await this.scheduledPublishingService.rescheduleArticle(
      id,
      rescheduleDto.newScheduledAt,
    );
  }

  /**
   * Cancel scheduled publication
   *
   * @param id - Article ID
   * @returns Unscheduled article
   */
  async unscheduleArticle(id: string): Promise<Article> {
    return await this.scheduledPublishingService.unscheduleArticle(id);
  }

  /**
   * Publish a scheduled article immediately
   *
   * @param id - Article ID
   * @returns Published article
   */
  async publishScheduledArticle(id: string): Promise<Article> {
    return await this.scheduledPublishingService.publishScheduledArticle(id);
  }

  /**
   * Update article status
   *
   * @param id - Article ID
   * @param statusDto - Status update data
   * @returns Updated article
   */
  async updateStatus(
    id: string,
    statusDto: UpdateArticleStatusDto,
  ): Promise<Article> {
    const article = await this.findById(id);

    // Handle status-specific logic
    switch (statusDto.status) {
      case ARTICLE_CONSTANTS.STATUS.SCHEDULED:
        if (!statusDto.scheduledAt) {
          throw new HttpException(
            { messageKey: 'article.SCHEDULED_DATE_REQUIRED' },
            HttpStatus.BAD_REQUEST,
          );
        }
        return await this.scheduledPublishingService.scheduleArticle(
          id,
          statusDto.scheduledAt,
        );

      case ARTICLE_CONSTANTS.STATUS.PUBLISHED:
        article.status = ARTICLE_CONSTANTS.STATUS.PUBLISHED;
        article.publishedAt = new Date();
        article.scheduledAt = undefined; // Clear scheduled time
        break;

      case ARTICLE_CONSTANTS.STATUS.DRAFT:
        article.status = ARTICLE_CONSTANTS.STATUS.DRAFT;
        article.scheduledAt = undefined; // Clear scheduled time
        break;

      case ARTICLE_CONSTANTS.STATUS.ARCHIVED:
        article.status = ARTICLE_CONSTANTS.STATUS.ARCHIVED;
        break;
    }

    article.updatedAt = new Date();
    return await this.articleRepository.save(article);
  }

  /**
   * Get scheduled articles
   *
   * @param paginationDto - Pagination parameters
   * @returns Paginated scheduled articles
   */
  async getScheduledArticles(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Article>> {
    return this.listOffset(paginationDto, {
      status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
    });
  }

  /**
   * Get scheduling statistics
   *
   * @returns Scheduling statistics
   */
  async getSchedulingStats() {
    const [totalScheduled, readyToPublish, nextScheduled] = await Promise.all([
      this.articleRepository.count({
        where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
      }),
      this.articleRepository.count({
        where: {
          status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
          scheduledAt: LessThanOrEqual(new Date()),
        },
      }),
      this.articleRepository
        .createQueryBuilder('article')
        .select('MIN(article.scheduledAt)', 'nextScheduled')
        .where('article.status = :status', {
          status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
        })
        .getRawOne()
        .then((result: any) => {
          if (result?.nextScheduled) {
            return new Date(result.nextScheduled as string);
          }
          return null;
        }),
    ]);

    return {
      totalScheduled,
      readyToPublish,
      nextScheduled,
    };
  }

  /**
   * Get existing slugs from database
   *
   * @param excludeId - Article ID to exclude from results
   * @returns Array of existing slugs
   */
  private async getExistingSlugs(excludeId?: string): Promise<string[]> {
    const where: FindOptionsWhere<Article> = {};
    if (excludeId) {
      where.id = Not(excludeId);
    }

    const articles = await this.articleRepository.find({
      where,
      select: ['slug'],
    });
    return articles.map((article) => article.slug);
  }

  /**
   * Validate custom slug
   *
   * @param slug - Slug to validate
   * @param existingSlugs - Existing slugs to check against
   * @returns Validation result
   */
  private async validateCustomSlug(slug: string, existingSlugs: string[]) {
    const { isValidSlug, createSlug, generateUniqueSlug } = await import(
      'src/common/utils/slug.util'
    );

    // Validate slug format
    const isValid = isValidSlug(slug, { minLength: 3, maxLength: 80 });

    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid slug format',
        suggestion: createSlug(slug, { maxLength: 80 }),
      };
    }

    // Check if slug is available
    if (existingSlugs.includes(slug)) {
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
}
