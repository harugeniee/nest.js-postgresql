import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CacheService, RabbitMQService } from 'src/shared/services';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { AnalyticsMetricService } from './services/analytics-metric.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockAnalyticsEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'id' },
        { propertyName: 'userId' },
        { propertyName: 'eventType' },
        { propertyName: 'eventCategory' },
        { propertyName: 'subjectType' },
        { propertyName: 'subjectId' },
        { propertyName: 'eventData' },
        { propertyName: 'sessionId' },
        { propertyName: 'ipAddress' },
        { propertyName: 'userAgent' },
        { propertyName: 'createdAt' },
        { propertyName: 'updatedAt' },
        { propertyName: 'deletedAt' },
      ],
    },
  };

  const mockAnalyticsMetricRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
  };

  const mockRabbitMQService = {
    sendDataToRabbitMQ: jest.fn(),
  };

  const mockAnalyticsMetricService = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: mockAnalyticsEventRepository,
        },
        {
          provide: getRepositoryToken(AnalyticsMetric),
          useValue: mockAnalyticsMetricRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
        {
          provide: AnalyticsMetricService,
          useValue: mockAnalyticsMetricService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
        subjectId: '123456789',
        eventData: { articleTitle: 'Test Article' },
      };

      const mockEvent = {
        id: '1',
        userId: 'user123',
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
        subjectId: '123456789',
        eventData: { articleTitle: 'Test Article' },
        sessionId: 'session123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnalyticsEventRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.trackEvent(
        trackEventDto,
        'user123',
        'session123',
      );

      expect(mockAnalyticsEventRepository.create).toHaveBeenCalledWith({
        userId: 'user123',
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
        subjectId: '123456789',
        eventData: { articleTitle: 'Test Article' },
        sessionId: 'session123',
      });
      expect(mockAnalyticsEventRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('should track an event without userId and sessionId', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'page_view',
        eventCategory: 'system',
      };

      const mockEvent = {
        id: '1',
        userId: null,
        eventType: 'page_view',
        eventCategory: 'system',
        sessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnalyticsEventRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.trackEvent(trackEventDto);

      expect(mockAnalyticsEventRepository.create).toHaveBeenCalledWith({
        userId: undefined,
        eventType: 'page_view',
        eventCategory: 'system',
        subjectType: undefined,
        subjectId: undefined,
        eventData: undefined,
        sessionId: undefined,
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('trackEventAsync', () => {
    it('should track an event asynchronously via queue', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
        subjectId: '123456789',
        eventData: { articleTitle: 'Test Article' },
      };

      const userId = 'user123';
      const sessionId = 'session123';
      const requestMetadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockRabbitMQService.sendDataToRabbitMQ.mockReturnValue(true);

      const result = await service.trackEventAsync(
        trackEventDto,
        userId,
        sessionId,
        requestMetadata,
      );

      expect(mockRabbitMQService.sendDataToRabbitMQ).toHaveBeenCalledWith(
        'analytics_track',
        expect.objectContaining({
          eventType: 'article_view',
          eventCategory: 'content',
          subjectType: 'article',
          subjectId: '123456789',
          eventData: { articleTitle: 'Test Article' },
          userId: 'user123',
          sessionId: 'session123',
          requestMetadata,
          timestamp: expect.any(String),
        }),
      );
      expect(result).toBe(true);
    });

    it('should handle queue failure gracefully', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'page_view',
        eventCategory: 'system',
      };

      mockRabbitMQService.sendDataToRabbitMQ.mockReturnValue(false);

      const result = await service.trackEventAsync(trackEventDto);

      expect(mockRabbitMQService.sendDataToRabbitMQ).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle queue errors gracefully', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'article_view',
        eventCategory: 'content',
      };

      mockRabbitMQService.sendDataToRabbitMQ.mockImplementation(() => {
        throw new Error('Queue connection failed');
      });

      const result = await service.trackEventAsync(trackEventDto);

      expect(result).toBe(false);
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics for date range', async () => {
      const userId = 'user123';
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockEvents = [
        {
          id: '1',
          userId: 'user123',
          eventType: 'article_view',
          eventCategory: 'content',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user123',
          eventType: 'reaction_set',
          eventCategory: 'engagement',
          createdAt: new Date(),
        },
        {
          id: '3',
          userId: 'user123',
          eventType: 'user_follow',
          eventCategory: 'social',
          createdAt: new Date(),
        },
      ];

      mockAnalyticsEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getUserAnalytics(userId, query);

      expect(mockAnalyticsEventRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          createdAt: expect.any(Object),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 100,
        skip: 0,
      });

      expect(result).toEqual({
        totalEvents: 3,
        eventTypes: {
          article_view: 1,
          reaction_set: 1,
          user_follow: 1,
        },
        contentInteractions: 1,
        socialInteractions: 2,
      });
    });

    it('should return empty analytics for user with no events', async () => {
      const userId = 'user123';
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      mockAnalyticsEventRepository.find.mockResolvedValue([]);

      const result = await service.getUserAnalytics(userId, query);

      expect(result).toEqual({
        totalEvents: 0,
        eventTypes: {},
        contentInteractions: 0,
        socialInteractions: 0,
      });
    });
  });

  describe('getContentPerformance', () => {
    it('should return content performance metrics', async () => {
      const subjectType = 'article';
      const subjectId = '123456789';
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockMetrics = [
        {
          id: '1',
          metricType: 'article_views',
          subjectType: 'article',
          subjectId: '123456789',
          metricValue: 100,
          dateKey: '2024-01-01',
        },
        {
          id: '2',
          metricType: 'article_likes',
          subjectType: 'article',
          subjectId: '123456789',
          metricValue: 25,
          dateKey: '2024-01-01',
        },
        {
          id: '3',
          metricType: 'article_comments',
          subjectType: 'article',
          subjectId: '123456789',
          metricValue: 10,
          dateKey: '2024-01-01',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMetrics),
      };

      mockAnalyticsMetricRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getContentPerformance(
        subjectType,
        subjectId,
        query,
      );

      expect(
        mockAnalyticsMetricRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('metric');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'metric.subjectType = :subjectType',
        {
          subjectType: 'article',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.subjectId = :subjectId',
        {
          subjectId: '123456789',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'metric.dateKey BETWEEN :fromDate AND :toDate',
        {
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        },
      );

      expect(result).toEqual({
        totalViews: 100,
        totalLikes: 25,
        totalComments: 10,
        totalShares: 0,
      });
    });
  });

  describe('getPlatformOverview', () => {
    it('should return platform overview statistics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(150),
      };

      mockAnalyticsEventRepository.count.mockResolvedValue(1000);
      mockAnalyticsEventRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getPlatformOverview();

      expect(mockAnalyticsEventRepository.count).toHaveBeenCalled();
      expect(
        mockAnalyticsEventRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('event');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT event.userId',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'event.userId IS NOT NULL',
      );

      expect(result).toEqual({
        totalEvents: 1000,
        totalUsers: 150,
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview with comprehensive analytics', async () => {
      const query: DashboardQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        granularity: 'day',
        eventTypes: ['article_view', 'user_follow'],
        eventCategories: ['content', 'social'],
        subjectTypes: ['article', 'user'],
        userIds: ['user1', 'user2'],
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockEvents = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          userId: 'user2',
          eventType: 'user_follow',
          eventCategory: 'social',
          subjectType: 'user',
          subjectId: 'user2',
          createdAt: new Date('2024-01-16'),
        },
        {
          id: '3',
          userId: 'user1',
          eventType: 'reaction_set',
          eventCategory: 'engagement',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date('2024-01-17'),
        },
      ];

      mockAnalyticsEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getDashboardOverview(query);

      expect(mockAnalyticsEventRepository.find).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object),
          eventType: expect.any(Object),
          eventCategory: expect.any(Object),
          subjectType: expect.any(Object),
          userId: expect.any(Object),
        },
        order: {
          createdAt: 'DESC',
        },
        take: 100,
      });

      expect(result).toEqual({
        totalEvents: 3,
        uniqueUsers: 2,
        eventTypes: {
          article_view: 1,
          user_follow: 1,
          reaction_set: 1,
        },
        eventCategories: {
          content: 1,
          social: 1,
          engagement: 1,
        },
        subjectTypes: {
          article: 2,
          user: 1,
        },
        contentInteractions: 1,
        socialInteractions: 1,
        systemInteractions: 0,
        engagementInteractions: 1,
        timeSeries: expect.any(Array),
        topUsers: expect.any(Object),
        topContent: expect.any(Object),
      });
    });

    it('should return dashboard overview with default parameters', async () => {
      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockEvents = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'page_view',
          eventCategory: 'system',
          createdAt: new Date(),
        },
      ];

      mockAnalyticsEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getDashboardOverview(query);

      expect(result.totalEvents).toBe(1);
      expect(result.uniqueUsers).toBe(1);
      expect(result.timeSeries).toBeDefined();
    });
  });

  describe('getAnalyticsEvents', () => {
    it('should return paginated analytics events with filtering', async () => {
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        eventType: 'article_view,user_follow',
        eventCategory: 'content,social',
        subjectType: 'article,user',
        userId: 'user123',
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockEvents = [
        {
          id: '1',
          userId: 'user123',
          eventType: 'article_view',
          eventCategory: 'content',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user123',
          eventType: 'user_follow',
          eventCategory: 'social',
          subjectType: 'user',
          subjectId: 'user2',
          createdAt: new Date(),
        },
      ];

      mockAnalyticsEventRepository.findAndCount.mockResolvedValue([
        mockEvents,
        2,
      ]);

      const result = await service.getAnalyticsEvents(query);

      expect(mockAnalyticsEventRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object),
          eventType: expect.any(Object),
          eventCategory: expect.any(Object),
          subjectType: expect.any(Object),
          userId: 'user123',
        },
        order: {
          createdAt: 'DESC',
        },
        take: 50,
        skip: 0,
      });

      expect(result).toEqual({
        events: mockEvents,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should return analytics events with default pagination', async () => {
      const query: AnalyticsQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockEvents = [];
      mockAnalyticsEventRepository.findAndCount.mockResolvedValue([
        mockEvents,
        0,
      ]);

      const result = await service.getAnalyticsEvents(query);

      expect(result).toEqual({
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('getMetricType', () => {
    it('should return correct metric type for known event types', () => {
      const testCases = [
        { eventType: 'article_view', expected: 'article_views' },
        { eventType: 'article_like', expected: 'article_likes' },
        { eventType: 'user_follow', expected: 'user_follows' },
        { eventType: 'reaction_set', expected: 'reaction_count' },
      ];

      testCases.forEach(({ eventType, expected }) => {
        const result = (service as any).getMetricType(eventType);
        expect(result).toBe(expected);
      });
    });

    it('should return null for unknown event types', () => {
      const result = (service as any).getMetricType('unknown_event');
      expect(result).toBeNull();
    });
  });

  describe('getStartDate', () => {
    it('should return correct start date for different time ranges', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      expect((service as any).getStartDate('1d').getTime()).toBeCloseTo(
        oneDayAgo.getTime(),
        -2,
      );
      expect((service as any).getStartDate('7d').getTime()).toBeCloseTo(
        sevenDaysAgo.getTime(),
        -2,
      );
      expect((service as any).getStartDate('30d').getTime()).toBeCloseTo(
        thirtyDaysAgo.getTime(),
        -2,
      );
      expect((service as any).getStartDate('90d').getTime()).toBeCloseTo(
        ninetyDaysAgo.getTime(),
        -2,
      );
      expect((service as any).getStartDate('invalid').getTime()).toBeCloseTo(
        thirtyDaysAgo.getTime(),
        -2,
      ); // default
    });
  });

  describe('aggregateUserEvents', () => {
    it('should aggregate user events correctly', () => {
      const events = [
        {
          id: '1',
          eventType: 'article_view',
          eventCategory: 'content',
        },
        {
          id: '2',
          eventType: 'article_like',
          eventCategory: 'content',
        },
        {
          id: '3',
          eventType: 'user_follow',
          eventCategory: 'social',
        },
        {
          id: '4',
          eventType: 'reaction_set',
          eventCategory: 'engagement',
        },
        {
          id: '5',
          eventType: 'page_view',
          eventCategory: 'system',
        },
      ] as AnalyticsEvent[];

      const result = (service as any).aggregateUserEvents(events);

      expect(result).toEqual({
        totalEvents: 5,
        eventTypes: {
          article_view: 1,
          article_like: 1,
          user_follow: 1,
          reaction_set: 1,
          page_view: 1,
        },
        contentInteractions: 2, // article_view, article_like
        socialInteractions: 2, // user_follow, reaction_set
      });
    });
  });

  describe('aggregateContentMetrics', () => {
    it('should aggregate content metrics correctly', () => {
      const metrics = [
        {
          id: '1',
          metricType: 'article_views',
          metricValue: 100,
        },
        {
          id: '2',
          metricType: 'article_likes',
          metricValue: 25,
        },
        {
          id: '3',
          metricType: 'article_comments',
          metricValue: 10,
        },
        {
          id: '4',
          metricType: 'article_shares',
          metricValue: 5,
        },
        {
          id: '5',
          metricType: 'unknown_metric',
          metricValue: 50,
        },
      ] as AnalyticsMetric[];

      const result = (service as any).aggregateContentMetrics(metrics);

      expect(result).toEqual({
        totalViews: 100,
        totalLikes: 25,
        totalComments: 10,
        totalShares: 5,
      });
    });
  });

  describe('aggregateDashboardEvents', () => {
    it('should aggregate dashboard events correctly with different granularities', () => {
      const events = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: '2',
          userId: 'user2',
          eventType: 'user_follow',
          eventCategory: 'social',
          subjectType: 'user',
          subjectId: 'user2',
          createdAt: new Date('2024-01-15T11:00:00Z'),
        },
        {
          id: '3',
          userId: 'user1',
          eventType: 'reaction_set',
          eventCategory: 'engagement',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date('2024-01-16T10:00:00Z'),
        },
        {
          id: '4',
          userId: 'user3',
          eventType: 'page_view',
          eventCategory: 'system',
          createdAt: new Date('2024-01-16T12:00:00Z'),
        },
        {
          id: '5',
          userId: 'user1',
          eventType: 'bookmark_create',
          eventCategory: 'engagement',
          subjectType: 'article',
          subjectId: 'article2',
          createdAt: new Date('2024-01-17T10:00:00Z'),
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        granularity: 'day',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result).toEqual({
        totalEvents: 5,
        uniqueUsers: 3,
        eventTypes: {
          article_view: 1,
          user_follow: 1,
          reaction_set: 1,
          page_view: 1,
          bookmark_create: 1,
        },
        eventCategories: {
          content: 1,
          social: 1,
          engagement: 2,
          system: 1,
        },
        subjectTypes: {
          article: 3,
          user: 1,
        },
        contentInteractions: 1, // article_view
        socialInteractions: 1, // user_follow
        systemInteractions: 1, // page_view
        engagementInteractions: 2, // reaction_set, bookmark_create
        timeSeries: expect.arrayContaining([
          { date: '2024-01-15', count: 2 },
          { date: '2024-01-16', count: 2 },
          { date: '2024-01-17', count: 1 },
        ]),
        topUsers: expect.any(Object),
        topContent: expect.any(Object),
      });
    });

    it('should handle hour granularity correctly', () => {
      const events = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          createdAt: new Date('2024-01-15T10:30:00Z'),
        },
        {
          id: '2',
          userId: 'user2',
          eventType: 'user_follow',
          eventCategory: 'social',
          createdAt: new Date('2024-01-15T10:45:00Z'),
        },
        {
          id: '3',
          userId: 'user1',
          eventType: 'reaction_set',
          eventCategory: 'engagement',
          createdAt: new Date('2024-01-15T11:15:00Z'),
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        granularity: 'hour',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result.timeSeries).toEqual(
        expect.arrayContaining([
          { date: '2024-01-15T10:00:00', count: 2 },
          { date: '2024-01-15T11:00:00', count: 1 },
        ]),
      );
    });

    it('should handle week granularity correctly', () => {
      const events = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          createdAt: new Date('2024-01-15T10:00:00Z'), // Monday
        },
        {
          id: '2',
          userId: 'user2',
          eventType: 'user_follow',
          eventCategory: 'social',
          createdAt: new Date('2024-01-20T10:00:00Z'), // Saturday
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        granularity: 'week',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result.timeSeries).toHaveLength(1);
      expect(result.timeSeries[0].date).toBe('2024-01-14'); // Week start (Sunday)
      expect(result.timeSeries[0].count).toBe(2);
    });

    it('should handle month granularity correctly', () => {
      const events = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: '2',
          userId: 'user2',
          eventType: 'user_follow',
          eventCategory: 'social',
          createdAt: new Date('2024-01-25T10:00:00Z'),
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        granularity: 'month',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result.timeSeries).toEqual([{ date: '2024-01', count: 2 }]);
    });

    it('should handle events without userId', () => {
      const events = [
        {
          id: '1',
          userId: null,
          eventType: 'page_view',
          eventCategory: 'system',
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          createdAt: new Date(),
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result.uniqueUsers).toBe(1);
      expect(result.topUsers).toEqual({ user1: 1 });
    });

    it('should handle events without subjectType', () => {
      const events = [
        {
          id: '1',
          userId: 'user1',
          eventType: 'page_view',
          eventCategory: 'system',
          subjectType: null,
          subjectId: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'user1',
          eventType: 'article_view',
          eventCategory: 'content',
          subjectType: 'article',
          subjectId: 'article1',
          createdAt: new Date(),
        },
      ] as AnalyticsEvent[];

      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const result = (service as any).aggregateDashboardEvents(events, query);

      expect(result.subjectTypes).toEqual({ article: 1 });
      expect(result.topContent).toEqual({ 'article:article1': 1 });
    });
  });
});
