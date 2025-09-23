import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { CacheService } from 'src/shared/services';
import { AnalyticsWidgetsService } from './services/analytics-widgets.service';
import { RealTimeAnalyticsService } from './services/real-time-analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockAnalyticsEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
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
          provide: AnalyticsWidgetsService,
          useValue: {
            getUserActivityDashboard: jest.fn(),
            getContentPerformanceDashboard: jest.fn(),
            getEngagementMetricsDashboard: jest.fn(),
            getTrafficSourcesDashboard: jest.fn(),
            getGeographicDataDashboard: jest.fn(),
            getConversionFunnelDashboard: jest.fn(),
            getRetentionAnalysisDashboard: jest.fn(),
            getRevenueMetricsDashboard: jest.fn(),
          },
        },
        {
          provide: RealTimeAnalyticsService,
          useValue: {
            getRealTimeAnalytics: jest.fn(),
            startRealTimeStreaming: jest.fn(),
            stopRealTimeStreaming: jest.fn(),
            processLiveEvent: jest.fn(),
            getRealTimeMetricsSummary: jest.fn(),
            getConnectionStats: jest.fn(),
          },
        },
        {
          provide: AnalyticsExportService,
          useValue: {
            exportAnalyticsData: jest.fn(),
          },
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
});
