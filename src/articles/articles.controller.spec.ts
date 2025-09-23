import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ScheduledPublishingService } from './services/scheduled-publishing.service';
import { CacheService } from 'src/shared/services';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { Reflector } from '@nestjs/core';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let articlesService: ArticlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
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
        {
          provide: AnalyticsService,
          useValue: {
            trackEvent: jest.fn().mockResolvedValue({}),
            getUserAnalytics: jest.fn().mockResolvedValue({}),
            getContentPerformance: jest.fn().mockResolvedValue({}),
            getPlatformOverview: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    articlesService = module.get<ArticlesService>(ArticlesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have ArticlesService injected', () => {
    expect(articlesService).toBeDefined();
  });

  describe('create', () => {
    it('should create an article', async () => {
      const createArticleDto = {
        title: 'Test Article',
        content: 'Test content',
        userId: 'user-123',
      };

      const mockArticle = {
        id: 'article-123',
        ...createArticleDto,
        slug: 'test-article',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(articlesService, 'createArticle')
        .mockResolvedValue(mockArticle as Article);

      const result = await controller.create(createArticleDto);

      expect(result).toEqual(mockArticle);
      expect(articlesService.createArticle).toHaveBeenCalledWith(
        createArticleDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated articles', async () => {
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

      jest.spyOn(articlesService, 'findAll').mockResolvedValue(mockResult);

      const result = await controller.findAll(paginationDto);

      expect(result).toEqual(mockResult);
      expect(articlesService.findAll).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findOne', () => {
    it('should return an article by id', async () => {
      const articleId = 'article-123';
      const mockArticle = {
        id: articleId,
        title: 'Test Article',
        content: 'Test content',
        userId: 'user-123',
      };

      jest
        .spyOn(articlesService, 'findOne')
        .mockResolvedValue(mockArticle as unknown as Article);

      const result = await controller.findOne(articleId);

      expect(result).toEqual(mockArticle);
      expect(articlesService.findOne).toHaveBeenCalledWith({ id: articleId });
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
        updatedAt: new Date(),
      };

      jest
        .spyOn(articlesService, 'updateArticle')
        .mockResolvedValue(mockUpdatedArticle as Article);

      const result = await controller.update(articleId, updateData);

      expect(result).toEqual(mockUpdatedArticle);
      expect(articlesService.updateArticle).toHaveBeenCalledWith(
        articleId,
        updateData,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an article', async () => {
      const articleId = 'article-123';

      jest.spyOn(articlesService, 'remove').mockResolvedValue(undefined);

      await controller.remove(articleId);

      expect(articlesService.remove).toHaveBeenCalledWith(articleId);
    });
  });
});
