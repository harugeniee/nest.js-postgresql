import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';
import { CacheService } from 'src/shared/services';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let articleRepository: Repository<Article>;
  let scheduledPublishingService: ScheduledPublishingService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            metadata: {
              columns: [
                { propertyName: 'deletedAt' },
                { propertyName: 'id' },
                { propertyName: 'title' },
              ],
            },
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getRawOne: jest.fn(),
            })),
          },
        },
        {
          provide: ScheduledPublishingService,
          useValue: {
            scheduleArticle: jest.fn(),
            rescheduleArticle: jest.fn(),
            unscheduleArticle: jest.fn(),
            publishScheduledArticle: jest.fn(),
            getScheduledArticles: jest.fn(),
            getSchedulingStats: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deleteKeysByPattern: jest.fn(),
            getTtl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    articleRepository = module.get<Repository<Article>>(
      getRepositoryToken(Article),
    );
    scheduledPublishingService = module.get<ScheduledPublishingService>(
      ScheduledPublishingService,
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all required dependencies', () => {
    expect(articleRepository).toBeDefined();
    expect(scheduledPublishingService).toBeDefined();
    expect(cacheService).toBeDefined();
  });

  describe('create', () => {
    it('should create an article with generated slug', async () => {
      const createArticleDto = {
        title: 'Test Article',
        content: 'Test content',
        userId: 'user-123',
      };

      const mockArticle = {
        id: 'article-123',
        ...createArticleDto,
        slug: 'test-article',
        user: null,
        summary: 'Test summary',
        contentFormat: 'html',
        visibility: 'public',
        status: 'draft',
        tags: ['test'],
        coverImageUrl: null,
        wordCount: 100,
        readTimeMinutes: 1,
        viewsCount: 0,
        likesCount: 0,
        bookmarksCount: 0,
        commentsCount: 0,
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Article;

      jest.spyOn(service, 'create').mockResolvedValue(mockArticle);

      const result = await service.create(createArticleDto);

      expect(result).toEqual(mockArticle);
      expect(service.create).toHaveBeenCalledWith(createArticleDto);
    });
  });

  describe('findById', () => {
    it('should find an article by id', async () => {
      const articleId = 'article-123';
      const mockArticle = {
        id: articleId,
        title: 'Test Article',
        content: 'Test content',
        userId: 'user-123',
        user: null,
        slug: 'test-article',
        summary: 'Test summary',
        contentFormat: 'html',
        visibility: 'public',
        status: 'draft',
        tags: ['test'],
        coverImageUrl: null,
        wordCount: 100,
        readTimeMinutes: 1,
        viewsCount: 0,
        likesCount: 0,
        bookmarksCount: 0,
        commentsCount: 0,
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      const result = await service.findById(articleId);

      expect(result).toEqual(mockArticle);
      expect(service.findById).toHaveBeenCalledWith(articleId);
    });
  });

  describe('findBySlug', () => {
    it('should find an article by slug', async () => {
      const slug = 'test-article';
      const mockArticle = {
        id: 'article-123',
        title: 'Test Article',
        slug: slug,
        content: 'Test content',
        userId: 'user-123',
        user: null,
        summary: 'Test summary',
        contentFormat: 'html',
        visibility: 'public',
        status: 'draft',
        tags: ['test'],
        coverImageUrl: null,
        wordCount: 100,
        readTimeMinutes: 1,
        viewsCount: 0,
        likesCount: 0,
        bookmarksCount: 0,
        commentsCount: 0,
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Article;

      jest.spyOn(service, 'findBySlug').mockResolvedValue(mockArticle);

      const result = await service.findBySlug(slug);

      expect(result).toEqual(mockArticle);
      expect(service.findBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('update', () => {
    it('should update an article', async () => {
      const articleId = 'article-123';
      const updateData = {
        title: 'Updated Article',
        content: 'Updated content',
      };

      const mockUpdatedArticle = {
        id: articleId,
        ...updateData,
        slug: 'updated-article',
        userId: 'user-123',
        user: null,
        summary: 'Test summary',
        contentFormat: 'html',
        visibility: 'public',
        status: 'draft',
        tags: ['test'],
        coverImageUrl: null,
        wordCount: 100,
        readTimeMinutes: 1,
        viewsCount: 0,
        likesCount: 0,
        bookmarksCount: 0,
        commentsCount: 0,
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Article;

      jest.spyOn(service, 'update').mockResolvedValue(mockUpdatedArticle);

      const result = await service.update(articleId, updateData);

      expect(result).toEqual(mockUpdatedArticle);
      expect(service.update).toHaveBeenCalledWith(articleId, updateData);
    });
  });

  describe('remove', () => {
    it('should soft delete an article', async () => {
      const articleId = 'article-123';

      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await service.remove(articleId);

      expect(service.remove).toHaveBeenCalledWith(articleId);
    });
  });

  describe('scheduleArticle', () => {
    it('should schedule an article for publication', async () => {
      const articleId = 'article-123';
      const scheduleDto = {
        scheduledAt: new Date('2024-12-31T12:00:00Z'),
        customSlug: 'custom-slug',
      };

      const mockArticle = {
        id: articleId,
        title: 'Test Article',
        content: 'Test content',
        userId: 'user-123',
        user: null,
        slug: 'test-article',
        summary: 'Test summary',
        contentFormat: 'html',
        visibility: 'public',
        status: 'draft',
        tags: ['test'],
        coverImageUrl: null,
        wordCount: 100,
        readTimeMinutes: 1,
        viewsCount: 0,
        likesCount: 0,
        bookmarksCount: 0,
        commentsCount: 0,
        scheduledAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Article;

      const mockScheduledArticle = {
        ...mockArticle,
        status: 'scheduled',
        scheduledAt: scheduleDto.scheduledAt,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(articleRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(scheduledPublishingService, 'scheduleArticle')
        .mockResolvedValue(mockScheduledArticle);

      const result = await service.scheduleArticle(articleId, scheduleDto);

      expect(result).toEqual(mockScheduledArticle);
      expect(scheduledPublishingService.scheduleArticle).toHaveBeenCalledWith(
        articleId,
        scheduleDto.scheduledAt,
      );
    });
  });

  describe('getScheduledArticles', () => {
    it('should get scheduled articles with pagination', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
      };

      const mockResult = {
        result: [],
        metaData: {
          total: 0,
          page: 1,
          pageSize: 10,
          limit: 10,
          totalPages: 0,
        },
      };

      jest.spyOn(service, 'getScheduledArticles').mockResolvedValue(mockResult);

      const result = await service.getScheduledArticles(paginationDto);

      expect(result).toEqual(mockResult);
      expect(service.getScheduledArticles).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('getSchedulingStats', () => {
    it('should get scheduling statistics', async () => {
      const mockStats = {
        totalScheduled: 5,
        readyToPublish: 2,
        nextScheduled: new Date('2024-12-31T12:00:00Z'),
      };

      jest.spyOn(service, 'getSchedulingStats').mockResolvedValue(mockStats);

      const result = await service.getSchedulingStats();

      expect(result).toEqual(mockStats);
      expect(service.getSchedulingStats).toHaveBeenCalled();
    });
  });
});
