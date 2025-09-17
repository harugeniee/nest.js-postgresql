import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { IPagination } from 'src/common/interface';
import { createSlug } from 'src/common/utils/slug.util';
import { Tag } from './entities/tag.entity';
import { CreateTagDto, QueryTagsDto, TagStatsDto } from './dto';
import { TAG_CONSTANTS } from 'src/shared/constants/tag.constants';

@Injectable()
export class TagsService extends BaseService<Tag> {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Tag>(tagRepository),
      {
        entityName: 'Tag',
        cache: {
          enabled: true,
          ttlSec: TAG_CONSTANTS.CACHE.TTL_SEC,
          prefix: TAG_CONSTANTS.CACHE.PREFIX,
          swrSec: TAG_CONSTANTS.CACHE.SWR_SEC,
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          articles: false, // Don't load articles by default for performance
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Tag)[] {
    return ['name', 'description'];
  }

  /**
   * Create a new tag
   */
  async create(createTagDto: CreateTagDto): Promise<Tag> {
    try {
      // Generate slug if not provided
      if (!createTagDto.slug) {
        createTagDto.slug = createSlug(createTagDto.name, {
          maxLength: TAG_CONSTANTS.SLUG_MAX_LENGTH,
          separator: '-',
        });
      }

      // Check if slug already exists
      const existingTag = await this.tagRepository.findOne({
        where: { slug: createTagDto.slug },
      });

      if (existingTag) {
        throw new HttpException(
          {
            messageKey: 'tag.SLUG_ALREADY_EXISTS',
            suggestion: `${createTagDto.slug}-${Date.now()}`,
          },
          HttpStatus.CONFLICT,
        );
      }

      // Set default color if not provided
      if (!createTagDto.color) {
        createTagDto.color = this.getRandomColor();
      }

      // Set default meta title and description if not provided
      if (!createTagDto.metaTitle) {
        createTagDto.metaTitle =
          TAG_CONSTANTS.SEO.DEFAULT_META_TITLE_TEMPLATE.replace(
            '{tagName}',
            createTagDto.name,
          );
      }

      if (!createTagDto.metaDescription) {
        createTagDto.metaDescription =
          TAG_CONSTANTS.SEO.DEFAULT_META_DESCRIPTION_TEMPLATE.replace(
            '{tagName}',
            createTagDto.name,
          );
      }

      const tag = await super.create(createTagDto);

      // Invalidate cache
      await this.invalidateTagCaches();

      this.logger.log(`Tag created: ${tag.name} (${tag.slug})`);
      return tag;
    } catch (error) {
      this.logger.error(`Error creating tag: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all tags with filtering and pagination
   */
  async findAll(query: QueryTagsDto): Promise<IPagination<Tag>> {
    try {
      const where: FindOptionsWhere<Tag> = {};

      // Apply filters
      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      if (query.isFeatured !== undefined) {
        where.isFeatured = query.isFeatured;
      }

      if (query.category) {
        where.metadata = { category: query.category };
      }

      if (query.color) {
        where.color = query.color;
      }

      if (
        query.minUsageCount !== undefined ||
        query.maxUsageCount !== undefined
      ) {
        where.usageCount = Between(
          query.minUsageCount || 0,
          query.maxUsageCount || Number.MAX_SAFE_INTEGER,
        );
      }

      // Apply search
      if (query.query) {
        where.name = Like(`%${query.query}%`);
      }

      // Apply sorting
      const sortBy = query.sortBy || TAG_CONSTANTS.SEARCH.DEFAULT_SORT_BY;
      const order = query.order || 'DESC';

      let orderBy: Record<string, 'ASC' | 'DESC'> = {};
      switch (sortBy) {
        case 'name':
          orderBy = { name: order };
          break;
        case 'usage':
          orderBy = { usageCount: order };
          break;
        case 'created':
          orderBy = { createdAt: order };
          break;
        case 'updated':
          orderBy = { updatedAt: order };
          break;
        default:
          orderBy = { usageCount: 'DESC' };
      }

      return await this.listOffset(query as any, where);
    } catch (error) {
      this.logger.error(`Error fetching tags: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tag by slug
   */
  async findBySlug(slug: string): Promise<Tag> {
    try {
      const tag = await this.findOne({ slug }, { relations: ['articles'] });
      if (!tag) {
        throw new HttpException(
          { messageKey: 'tag.NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }
      return tag;
    } catch (error) {
      this.logger.error(
        `Error fetching tag by slug: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update tag usage count
   */
  async updateUsageCount(tagId: string, increment: number = 1): Promise<void> {
    try {
      await this.tagRepository.increment(
        { id: tagId },
        'usageCount',
        increment,
      );

      // Invalidate cache
      await this.invalidateTagCaches();
    } catch (error) {
      this.logger.error(
        `Error updating tag usage count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<Tag[]> {
    try {
      const cacheKey = `tags:popular:${limit}`;
      const cached = await this.cacheService?.get<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const tags = await this.tagRepository.find({
        where: {
          isActive: true,
          usageCount: Between(
            TAG_CONSTANTS.POPULARITY.MIN_USAGE_FOR_POPULAR,
            Number.MAX_SAFE_INTEGER,
          ),
        },
        order: { usageCount: 'DESC' },
        take: limit,
      });

      await this.cacheService?.set(
        cacheKey,
        tags,
        TAG_CONSTANTS.CACHE.POPULAR_TTL_SEC,
      );
      return tags;
    } catch (error) {
      this.logger.error(
        `Error fetching popular tags: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get trending tags
   */
  async getTrendingTags(limit: number = 10): Promise<Tag[]> {
    try {
      const cacheKey = `tags:trending:${limit}`;
      const cached = await this.cacheService?.get<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const tags = await this.tagRepository.find({
        where: {
          isActive: true,
          usageCount: Between(
            TAG_CONSTANTS.POPULARITY.MIN_USAGE_FOR_TRENDING,
            Number.MAX_SAFE_INTEGER,
          ),
        },
        order: { usageCount: 'DESC' },
        take: limit,
      });

      await this.cacheService?.set(
        cacheKey,
        tags,
        TAG_CONSTANTS.CACHE.POPULAR_TTL_SEC,
      );
      return tags;
    } catch (error) {
      this.logger.error(
        `Error fetching trending tags: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get featured tags
   */
  async getFeaturedTags(limit: number = 10): Promise<Tag[]> {
    try {
      const cacheKey = `tags:featured:${limit}`;
      const cached = await this.cacheService?.get<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const tags = await this.tagRepository.find({
        where: {
          isActive: true,
          isFeatured: true,
        },
        order: { usageCount: 'DESC' },
        take: limit,
      });

      await this.cacheService?.set(
        cacheKey,
        tags,
        TAG_CONSTANTS.CACHE.POPULAR_TTL_SEC,
      );
      return tags;
    } catch (error) {
      this.logger.error(
        `Error fetching featured tags: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Search tags with suggestions
   */
  async searchTags(
    query: string,
    limit: number = TAG_CONSTANTS.SEARCH.MAX_SUGGESTIONS,
  ): Promise<Tag[]> {
    try {
      if (!query || query.length < TAG_CONSTANTS.SEARCH.MIN_QUERY_LENGTH) {
        return [];
      }

      const cacheKey = `tags:search:${query}:${limit}`;
      const cached = await this.cacheService?.get<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const tags = await this.tagRepository.find({
        where: [
          { name: Like(`%${query}%`), isActive: true },
          { description: Like(`%${query}%`), isActive: true },
        ],
        order: { usageCount: 'DESC' },
        take: limit,
      });

      await this.cacheService?.set(cacheKey, tags, TAG_CONSTANTS.CACHE.TTL_SEC);
      return tags;
    } catch (error) {
      this.logger.error(`Error searching tags: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tag statistics
   */
  async getStats(): Promise<TagStatsDto> {
    try {
      const cacheKey = 'tags:stats';
      const cached = await this.cacheService?.get<TagStatsDto>(cacheKey);
      if (cached) {
        return cached;
      }

      const [
        totalTags,
        activeTags,
        inactiveTags,
        featuredTags,
        popularTags,
        trendingTags,
        totalUsageCount,
        mostUsedTag,
        tagsByCategory,
        tagsByColor,
      ] = await Promise.all([
        this.tagRepository.count(),
        this.tagRepository.count({ where: { isActive: true } }),
        this.tagRepository.count({ where: { isActive: false } }),
        this.tagRepository.count({ where: { isFeatured: true } }),
        this.tagRepository.count({
          where: {
            isActive: true,
            usageCount: Between(
              TAG_CONSTANTS.POPULARITY.MIN_USAGE_FOR_POPULAR,
              Number.MAX_SAFE_INTEGER,
            ),
          },
        }),
        this.tagRepository.count({
          where: {
            isActive: true,
            usageCount: Between(
              TAG_CONSTANTS.POPULARITY.MIN_USAGE_FOR_TRENDING,
              Number.MAX_SAFE_INTEGER,
            ),
          },
        }),
        this.tagRepository
          .createQueryBuilder('tag')
          .select('SUM(tag.usageCount)', 'total')
          .getRawOne()
          .then((result) => parseInt(result.total) || 0),
        this.tagRepository
          .createQueryBuilder('tag')
          .select(['tag.name', 'tag.usageCount'])
          .orderBy('tag.usageCount', 'DESC')
          .limit(1)
          .getRawOne(),
        this.getTagsByCategory(),
        this.getTagsByColor(),
      ]);

      const averageUsageCount = totalTags > 0 ? totalUsageCount / totalTags : 0;

      const stats: TagStatsDto = {
        totalTags,
        activeTags,
        inactiveTags,
        featuredTags,
        popularTags,
        trendingTags,
        totalUsageCount,
        averageUsageCount: Math.round(averageUsageCount * 100) / 100,
        mostUsedTag: mostUsedTag?.name || 'N/A',
        mostUsedTagCount: mostUsedTag?.usageCount || 0,
        tagsByCategory,
        tagsByColor,
        recentTrends: await this.getRecentTrends(),
      };

      await this.cacheService?.set(
        cacheKey,
        stats,
        TAG_CONSTANTS.CACHE.STATS_TTL_SEC,
      );
      return stats;
    } catch (error) {
      this.logger.error(
        `Error getting tag statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get tags by category
   */
  private async getTagsByCategory(): Promise<Record<string, number>> {
    try {
      const result = await this.tagRepository
        .createQueryBuilder('tag')
        .select('tag.metadata->category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('tag.metadata->category IS NOT NULL')
        .groupBy('tag.metadata->category')
        .getRawMany();

      return result.reduce(
        (acc, item) => {
          const category = item.category;
          acc[category] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      );
    } catch (error) {
      this.logger.error(
        `Error getting tags by category: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Get tags by color
   */
  private async getTagsByColor(): Promise<Record<string, number>> {
    try {
      const result = await this.tagRepository
        .createQueryBuilder('tag')
        .select('tag.color', 'color')
        .addSelect('COUNT(*)', 'count')
        .where('tag.color IS NOT NULL')
        .groupBy('tag.color')
        .getRawMany();

      return result.reduce(
        (acc, item) => {
          acc[item.color] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      );
    } catch (error) {
      this.logger.error(
        `Error getting tags by color: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Get recent trends
   */
  private async getRecentTrends(): Promise<
    Array<{ date: string; count: number }>
  > {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.tagRepository
        .createQueryBuilder('tag')
        .select('DATE(tag.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('tag.createdAt >= :date', { date: thirtyDaysAgo })
        .groupBy('DATE(tag.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany();

      return result.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
      }));
    } catch (error) {
      this.logger.error(
        `Error getting recent trends: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get random color from default colors
   */
  private getRandomColor(): string {
    const colors = TAG_CONSTANTS.DEFAULT_COLORS;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Invalidate tag-related caches
   */
  private async invalidateTagCaches(): Promise<void> {
    try {
      const patterns = [
        'tags:popular:*',
        'tags:trending:*',
        'tags:featured:*',
        'tags:search:*',
        'tags:stats',
      ];

      for (const pattern of patterns) {
        await this.cacheService?.delete(pattern);
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating tag caches: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Bulk create tags from array of names
   */
  async bulkCreate(tagNames: string[]): Promise<Tag[]> {
    try {
      const tags: Tag[] = [];

      for (const name of tagNames) {
        try {
          const tag = await this.create({ name });
          tags.push(tag);
        } catch (error) {
          // Skip if tag already exists
          if (error.status === HttpStatus.CONFLICT) {
            this.logger.warn(`Tag already exists: ${name}`);
            continue;
          }
          throw error;
        }
      }

      return tags;
    } catch (error) {
      this.logger.error(
        `Error bulk creating tags: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get tag suggestions based on content
   */
  async getContentSuggestions(content: string): Promise<Tag[]> {
    try {
      const suggestions: Tag[] = [];
      const contentLower = content.toLowerCase();

      // Check against content suggestions
      for (const [category, tags] of Object.entries(
        TAG_CONSTANTS.CONTENT_SUGGESTIONS,
      )) {
        for (const tagName of tags) {
          if (contentLower.includes(tagName.toLowerCase())) {
            const tag = await this.tagRepository.findOne({
              where: { name: tagName, isActive: true },
            });
            if (tag) {
              suggestions.push(tag);
            }
          }
        }
      }

      return suggestions.slice(0, TAG_CONSTANTS.SEARCH.MAX_SUGGESTIONS);
    } catch (error) {
      this.logger.error(
        `Error getting content suggestions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
