import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ScheduledPublishingService } from './scheduled-publishing.service';
import { Article } from '../entities/article.entity';
import { ARTICLE_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

describe('ScheduledPublishingService', () => {
  let service: ScheduledPublishingService;
  let articleRepository: Repository<Article>;
  let cacheService: CacheService;

  const mockArticle = {
    id: 'article-123',
    title: 'Test Article',
    content: 'Test content',
    userId: 'user-123',
    user: null,
    slug: 'test-article',
    summary: 'Test summary',
    contentFormat: ARTICLE_CONSTANTS.CONTENT_FORMAT.HTML,
    visibility: ARTICLE_CONSTANTS.VISIBILITY.PUBLIC,
    status: ARTICLE_CONSTANTS.STATUS.DRAFT,
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
    uuid: 'test-uuid',
    deletedAt: null,
    version: 1,
    generateId: jest.fn(),
    toJSON: jest.fn(),
    isDeleted: jest.fn(),
    getAge: jest.fn(),
    getTimeSinceUpdate: jest.fn(),
  } as unknown as Article;

  const mockScheduledArticle = {
    ...mockArticle,
    status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
    scheduledAt: new Date('2024-12-31T12:00:00Z'),
  } as unknown as Article;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledPublishingService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
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
              getMany: jest.fn(),
              getRawOne: jest.fn(),
            })),
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

    service = module.get<ScheduledPublishingService>(
      ScheduledPublishingService,
    );
    articleRepository = module.get<Repository<Article>>(
      getRepositoryToken(Article),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all required dependencies', () => {
    expect(articleRepository).toBeDefined();
    expect(cacheService).toBeDefined();
  });

  describe('scheduleArticle', () => {
    it('should schedule an article for future publication', async () => {
      const articleId = 'article-123';
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);
      jest.spyOn(service, 'update').mockResolvedValue(mockScheduledArticle);

      const result = await service.scheduleArticle(articleId, scheduledAt);

      expect(result).toEqual(mockScheduledArticle);
      expect(service.findById).toHaveBeenCalledWith(articleId);
      expect(service.update).toHaveBeenCalledWith(articleId, {
        status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
        scheduledAt: scheduledAt,
      });
    });

    it('should throw error when trying to schedule a published article', async () => {
      const articleId = 'article-123';
      const scheduledAt = new Date('2024-12-31T12:00:00Z');
      const publishedArticle = {
        ...mockArticle,
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(publishedArticle);

      await expect(
        service.scheduleArticle(articleId, scheduledAt),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.CANNOT_SCHEDULE_PUBLISHED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when trying to schedule an archived article', async () => {
      const articleId = 'article-123';
      const scheduledAt = new Date('2024-12-31T12:00:00Z');
      const archivedArticle = {
        ...mockArticle,
        status: ARTICLE_CONSTANTS.STATUS.ARCHIVED,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(archivedArticle);

      await expect(
        service.scheduleArticle(articleId, scheduledAt),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.CANNOT_SCHEDULE_ARCHIVED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when scheduled date is in the past', async () => {
      const articleId = 'article-123';
      const pastDate = new Date('2020-01-01T12:00:00Z');

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      await expect(
        service.scheduleArticle(articleId, pastDate),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.INVALID_SCHEDULED_DATE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when scheduled date is too far in the future', async () => {
      const articleId = 'article-123';
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      await expect(
        service.scheduleArticle(articleId, farFutureDate),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.SCHEDULED_DATE_TOO_FAR' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('unscheduleArticle', () => {
    it('should unschedule a scheduled article', async () => {
      const articleId = 'article-123';
      const unscheduledArticle = {
        ...mockScheduledArticle,
        status: ARTICLE_CONSTANTS.STATUS.DRAFT,
        scheduledAt: undefined,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(mockScheduledArticle);
      jest.spyOn(service, 'update').mockResolvedValue(unscheduledArticle);

      const result = await service.unscheduleArticle(articleId);

      expect(result).toEqual(unscheduledArticle);
      expect(service.findById).toHaveBeenCalledWith(articleId);
      expect(service.update).toHaveBeenCalledWith(articleId, {
        status: ARTICLE_CONSTANTS.STATUS.DRAFT,
        scheduledAt: undefined,
      });
    });

    it('should throw error when trying to unschedule a non-scheduled article', async () => {
      const articleId = 'article-123';

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      await expect(service.unscheduleArticle(articleId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.NOT_SCHEDULED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('rescheduleArticle', () => {
    it('should reschedule an article', async () => {
      const articleId = 'article-123';
      const newScheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      const rescheduledArticle = {
        ...mockScheduledArticle,
        scheduledAt: newScheduledAt,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(mockScheduledArticle);
      jest.spyOn(service, 'update').mockResolvedValue(rescheduledArticle);

      const result = await service.rescheduleArticle(articleId, newScheduledAt);

      expect(result).toEqual(rescheduledArticle);
      expect(service.findById).toHaveBeenCalledWith(articleId);
      expect(service.update).toHaveBeenCalledWith(articleId, {
        scheduledAt: newScheduledAt,
      });
    });

    it('should throw error when trying to reschedule a non-scheduled article', async () => {
      const articleId = 'article-123';
      const newScheduledAt = new Date('2024-12-31T15:00:00Z');

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      await expect(
        service.rescheduleArticle(articleId, newScheduledAt),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.NOT_SCHEDULED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when new scheduled date is in the past', async () => {
      const articleId = 'article-123';
      const pastDate = new Date('2020-01-01T12:00:00Z');

      jest.spyOn(service, 'findById').mockResolvedValue(mockScheduledArticle);

      await expect(
        service.rescheduleArticle(articleId, pastDate),
      ).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.INVALID_SCHEDULED_DATE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('publishScheduledArticle', () => {
    it('should publish a scheduled article immediately', async () => {
      const articleId = 'article-123';
      const publishedArticle = {
        ...mockScheduledArticle,
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
        publishedAt: new Date(),
        scheduledAt: undefined,
      } as unknown as Article;

      jest.spyOn(service, 'findById').mockResolvedValue(mockScheduledArticle);
      jest.spyOn(service, 'update').mockResolvedValue(publishedArticle);

      const result = await service.publishScheduledArticle(articleId);

      expect(result).toEqual(publishedArticle);
      expect(service.findById).toHaveBeenCalledWith(articleId);
      expect(service.update).toHaveBeenCalledWith(articleId, {
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
        publishedAt: expect.any(Date),
        scheduledAt: undefined,
      });
    });

    it('should throw error when trying to publish a non-scheduled article', async () => {
      const articleId = 'article-123';

      jest.spyOn(service, 'findById').mockResolvedValue(mockArticle);

      await expect(service.publishScheduledArticle(articleId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'article.NOT_SCHEDULED' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('getScheduledArticles', () => {
    it('should return scheduled articles with pagination', async () => {
      const mockScheduledArticles = [mockScheduledArticle];
      const limit = 10;
      const offset = 0;

      jest
        .spyOn(articleRepository, 'find')
        .mockResolvedValue(mockScheduledArticles);

      const result = await service.getScheduledArticles(limit, offset);

      expect(result).toEqual(mockScheduledArticles);
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
        order: { scheduledAt: 'ASC' },
        take: limit,
        skip: offset,
      });
    });

    it('should use default pagination values when not provided', async () => {
      const mockScheduledArticles = [mockScheduledArticle];

      jest
        .spyOn(articleRepository, 'find')
        .mockResolvedValue(mockScheduledArticles);

      const result = await service.getScheduledArticles();

      expect(result).toEqual(mockScheduledArticles);
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
        order: { scheduledAt: 'ASC' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('getScheduledArticlesInRange', () => {
    it('should return scheduled articles within date range', async () => {
      const startDate = new Date('2024-12-01T00:00:00Z');
      const endDate = new Date('2024-12-31T23:59:59Z');
      const mockScheduledArticles = [mockScheduledArticle];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockScheduledArticles),
      };

      jest
        .spyOn(articleRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getScheduledArticlesInRange(
        startDate,
        endDate,
      );

      expect(result).toEqual(mockScheduledArticles);
      expect(articleRepository.createQueryBuilder).toHaveBeenCalledWith(
        'article',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'article.status = :status',
        {
          status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'article.scheduledAt >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'article.scheduledAt <= :endDate',
        { endDate },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'article.scheduledAt',
        'ASC',
      );
    });
  });

  describe('getReadyToPublishArticles', () => {
    it('should return articles ready to be published', async () => {
      const now = new Date();
      const readyArticle = {
        ...mockScheduledArticle,
        scheduledAt: new Date(now.getTime() - 1000), // 1 second ago
      } as unknown as Article;
      const mockReadyArticles = [readyArticle];

      jest
        .spyOn(articleRepository, 'find')
        .mockResolvedValue(mockReadyArticles);

      const result = await service.getReadyToPublishArticles();

      expect(result).toEqual(mockReadyArticles);
      expect(articleRepository.find).toHaveBeenCalledWith({
        where: {
          status: ARTICLE_CONSTANTS.STATUS.SCHEDULED,
          scheduledAt: LessThanOrEqual(now),
        },
        order: { scheduledAt: 'ASC' },
      });
    });
  });

  describe('publishArticle', () => {
    it('should publish a single article', async () => {
      const publishedArticle = {
        ...mockScheduledArticle,
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
        publishedAt: new Date(),
        scheduledAt: undefined,
      } as unknown as Article;

      jest.spyOn(service, 'update').mockResolvedValue(publishedArticle);

      const result = await service['publishArticle'](mockScheduledArticle);

      expect(result).toEqual(publishedArticle);
      expect(service.update).toHaveBeenCalledWith(mockScheduledArticle.id, {
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
        publishedAt: expect.any(Date),
        scheduledAt: undefined,
      });
    });
  });

  describe('getSchedulingStats', () => {
    it('should return scheduling statistics', async () => {
      const mockStats = {
        totalScheduled: 5,
        readyToPublish: 2,
        nextScheduled: new Date('2024-12-31T12:00:00Z'),
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          nextScheduled: mockStats.nextScheduled.toISOString(),
        }),
      };

      jest
        .spyOn(articleRepository, 'count')
        .mockResolvedValueOnce(mockStats.totalScheduled);
      jest
        .spyOn(service, 'getReadyToPublishArticles')
        .mockResolvedValue(new Array(mockStats.readyToPublish) as Article[]);
      jest
        .spyOn(articleRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getSchedulingStats();

      expect(result).toEqual(mockStats);
      expect(articleRepository.count).toHaveBeenCalledWith({
        where: { status: ARTICLE_CONSTANTS.STATUS.SCHEDULED },
      });
      expect(service.getReadyToPublishArticles).toHaveBeenCalled();
    });

    it('should return null for nextScheduled when no articles are scheduled', async () => {
      const mockStats = {
        totalScheduled: 0,
        readyToPublish: 0,
        nextScheduled: null,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(articleRepository, 'count')
        .mockResolvedValueOnce(mockStats.totalScheduled);
      jest.spyOn(service, 'getReadyToPublishArticles').mockResolvedValue([]);
      jest
        .spyOn(articleRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getSchedulingStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('validateScheduledDate', () => {
    it('should not throw error for valid future date', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      expect(() => service['validateScheduledDate'](futureDate)).not.toThrow();
    });

    it('should throw error for past date', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      expect(() => service['validateScheduledDate'](pastDate)).toThrow(
        new HttpException(
          { messageKey: 'article.INVALID_SCHEDULED_DATE' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error for date too far in the future', () => {
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);

      expect(() => service['validateScheduledDate'](farFutureDate)).toThrow(
        new HttpException(
          { messageKey: 'article.SCHEDULED_DATE_TOO_FAR' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('getSearchableColumns', () => {
    it('should return correct searchable columns', () => {
      const searchableColumns = service['getSearchableColumns']();

      expect(searchableColumns).toEqual(['title', 'summary', 'content']);
    });
  });
});
