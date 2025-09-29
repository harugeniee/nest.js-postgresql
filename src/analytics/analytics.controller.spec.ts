import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthPayload } from 'src/common/interface';
import { CacheService } from 'src/shared/services';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { TrackEventDto } from './dto/track-event.dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockAnalyticsService = {
    trackEvent: jest.fn(),
    getUserAnalytics: jest.fn(),
    getContentPerformance: jest.fn(),
    getPlatformOverview: jest.fn(),
    getDashboardOverview: jest.fn(),
    getAnalyticsEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      const mockUser: AuthPayload = {
        uid: 'user123',
        role: 'user',
        ssid: 'session123',
      };

      const mockRequest = {
        user: mockUser,
      };

      const mockResponse = {
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

      mockAnalyticsService.trackEvent.mockResolvedValue(mockResponse);

      const result = await controller.trackEvent(
        trackEventDto,
        mockRequest as any,
      );

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        trackEventDto,
        'user123',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should track an event without user context', async () => {
      const trackEventDto: TrackEventDto = {
        eventType: 'page_view',
        eventCategory: 'system',
      };

      const mockRequest = {
        user: null,
      };

      const mockResponse = {
        id: '1',
        userId: null,
        eventType: 'page_view',
        eventCategory: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnalyticsService.trackEvent.mockResolvedValue(mockResponse);

      // Mock the controller method to handle null user
      const trackEventSpy = jest.spyOn(controller, 'trackEvent');
      trackEventSpy.mockImplementation(async (dto, req) => {
        return mockAnalyticsService.trackEvent(dto, req.user?.uid);
      });

      const result = await controller.trackEvent(
        trackEventDto,
        mockRequest as any,
      );

      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
        trackEventDto,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics for specified date range', async () => {
      const userId = 'user123';
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockAnalytics = {
        totalEvents: 25,
        eventTypes: {
          article_view: 10,
          reaction_set: 8,
          user_follow: 5,
          comment_create: 2,
        },
        contentInteractions: 12,
        socialInteractions: 13,
      };

      mockAnalyticsService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getUserAnalytics(userId, query);

      expect(mockAnalyticsService.getUserAnalytics).toHaveBeenCalledWith(
        userId,
        query,
      );
      expect(result).toEqual(mockAnalytics);
    });

    it('should return user analytics with default date range', async () => {
      const userId = 'user123';
      const query: AnalyticsQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockAnalytics = {
        totalEvents: 50,
        eventTypes: {
          article_view: 20,
          reaction_set: 15,
          user_follow: 10,
          comment_create: 5,
        },
        contentInteractions: 25,
        socialInteractions: 25,
      };

      mockAnalyticsService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getUserAnalytics(userId, query);

      expect(mockAnalyticsService.getUserAnalytics).toHaveBeenCalledWith(
        userId,
        query,
      );
      expect(result).toEqual(mockAnalytics);
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

      const mockPerformance = {
        totalViews: 1000,
        totalLikes: 150,
        totalComments: 50,
        totalShares: 25,
      };

      mockAnalyticsService.getContentPerformance.mockResolvedValue(
        mockPerformance,
      );

      const result = await controller.getContentPerformance(
        subjectType,
        subjectId,
        query,
      );

      expect(mockAnalyticsService.getContentPerformance).toHaveBeenCalledWith(
        subjectType,
        subjectId,
        query,
      );
      expect(result).toEqual(mockPerformance);
    });

    it('should return content performance with different date range', async () => {
      const subjectType = 'comment';
      const subjectId = '987654321';
      const query: AnalyticsQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-07'),
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockPerformance = {
        totalViews: 200,
        totalLikes: 30,
        totalComments: 10,
        totalShares: 5,
      };

      mockAnalyticsService.getContentPerformance.mockResolvedValue(
        mockPerformance,
      );

      const result = await controller.getContentPerformance(
        subjectType,
        subjectId,
        query,
      );

      expect(mockAnalyticsService.getContentPerformance).toHaveBeenCalledWith(
        subjectType,
        subjectId,
        query,
      );
      expect(result).toEqual(mockPerformance);
    });
  });

  describe('getPlatformOverview', () => {
    it('should return platform overview statistics', async () => {
      const mockOverview = {
        totalEvents: 10000,
        totalUsers: 500,
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      };

      mockAnalyticsService.getPlatformOverview.mockResolvedValue(mockOverview);

      const result = await controller.getPlatformOverview();

      expect(mockAnalyticsService.getPlatformOverview).toHaveBeenCalled();
      expect(result).toEqual(mockOverview);
    });

    it('should return platform overview with current timestamp', async () => {
      const beforeCall = new Date();
      const mockOverview = {
        totalEvents: 5000,
        totalUsers: 250,
        lastUpdated: new Date(),
      };

      mockAnalyticsService.getPlatformOverview.mockResolvedValue(mockOverview);

      const result = await controller.getPlatformOverview();
      const afterCall = new Date();

      expect(result.totalEvents).toBe(5000);
      expect(result.totalUsers).toBe(250);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(result.lastUpdated.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
    });
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview analytics', async () => {
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

      const mockDashboardData = {
        totalEvents: 150,
        uniqueUsers: 25,
        eventTypes: {
          article_view: 80,
          user_follow: 40,
          reaction_set: 30,
        },
        eventCategories: {
          content: 80,
          social: 40,
          engagement: 30,
        },
        subjectTypes: {
          article: 110,
          user: 40,
        },
        contentInteractions: 80,
        socialInteractions: 40,
        systemInteractions: 0,
        engagementInteractions: 30,
        timeSeries: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 8 },
          { date: '2024-01-03', count: 12 },
        ],
        topUsers: {
          user1: 25,
          user2: 20,
          user3: 15,
        },
        topContent: {
          'article:article1': 15,
          'article:article2': 12,
          'user:user1': 8,
        },
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getDashboardOverview(query);

      expect(mockAnalyticsService.getDashboardOverview).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual(mockDashboardData);
    });

    it('should return dashboard overview with default parameters', async () => {
      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 50,
        uniqueUsers: 10,
        eventTypes: { page_view: 50 },
        eventCategories: { system: 50 },
        subjectTypes: {},
        contentInteractions: 0,
        socialInteractions: 0,
        systemInteractions: 50,
        engagementInteractions: 0,
        timeSeries: [{ date: '2024-01-01', count: 50 }],
        topUsers: {},
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getDashboardOverview(query);

      expect(result).toEqual(mockDashboardData);
    });
  });

  describe('getAnalyticsEvents', () => {
    it('should return paginated analytics events', async () => {
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

      const mockResponse = {
        events: mockEvents,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      mockAnalyticsService.getAnalyticsEvents.mockResolvedValue(mockResponse);

      const result = await controller.getAnalyticsEvents(query);

      expect(mockAnalyticsService.getAnalyticsEvents).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return analytics events with default pagination', async () => {
      const query: AnalyticsQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockResponse = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockAnalyticsService.getAnalyticsEvents.mockResolvedValue(mockResponse);

      const result = await controller.getAnalyticsEvents(query);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAnalyticsTrends', () => {
    it('should return analytics trends over time', async () => {
      const query: DashboardQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        granularity: 'day',
        eventTypes: ['article_view'],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 100,
        uniqueUsers: 20,
        timeSeries: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 8 },
          { date: '2024-01-03', count: 12 },
        ],
        eventTypes: { article_view: 100 },
        eventCategories: { content: 100 },
        subjectTypes: { article: 100 },
        contentInteractions: 100,
        socialInteractions: 0,
        systemInteractions: 0,
        engagementInteractions: 0,
        topUsers: {},
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getAnalyticsTrends(query);

      expect(mockAnalyticsService.getDashboardOverview).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual({
        timeSeries: mockDashboardData.timeSeries,
        totalEvents: mockDashboardData.totalEvents,
        uniqueUsers: mockDashboardData.uniqueUsers,
        granularity: 'day',
      });
    });

    it('should return analytics trends with default granularity', async () => {
      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 50,
        uniqueUsers: 10,
        timeSeries: [{ date: '2024-01-01', count: 50 }],
        eventTypes: {},
        eventCategories: {},
        subjectTypes: {},
        contentInteractions: 0,
        socialInteractions: 0,
        systemInteractions: 0,
        engagementInteractions: 0,
        topUsers: {},
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getAnalyticsTrends(query);

      expect(result.granularity).toBe('day');
    });
  });

  describe('getTopContent', () => {
    it('should return top performing content analytics', async () => {
      const query: DashboardQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        subjectTypes: ['article'],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 200,
        uniqueUsers: 30,
        timeSeries: [],
        eventTypes: {},
        eventCategories: {},
        subjectTypes: { article: 200 },
        contentInteractions: 200,
        socialInteractions: 0,
        systemInteractions: 0,
        engagementInteractions: 0,
        topUsers: {},
        topContent: {
          'article:article1': 50,
          'article:article2': 30,
          'article:article3': 20,
        },
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getTopContent(query);

      expect(mockAnalyticsService.getDashboardOverview).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual({
        topContent: mockDashboardData.topContent,
        contentInteractions: mockDashboardData.contentInteractions,
        subjectTypes: mockDashboardData.subjectTypes,
      });
    });

    it('should return top content with empty data', async () => {
      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 0,
        uniqueUsers: 0,
        timeSeries: [],
        eventTypes: {},
        eventCategories: {},
        subjectTypes: {},
        contentInteractions: 0,
        socialInteractions: 0,
        systemInteractions: 0,
        engagementInteractions: 0,
        topUsers: {},
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getTopContent(query);

      expect(result).toEqual({
        topContent: {},
        contentInteractions: 0,
        subjectTypes: {},
      });
    });
  });

  describe('getUserEngagement', () => {
    it('should return user engagement analytics', async () => {
      const query: DashboardQueryDto = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        eventCategories: ['social', 'engagement'],
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 150,
        uniqueUsers: 25,
        timeSeries: [],
        eventTypes: {
          user_follow: 50,
          reaction_set: 40,
          bookmark_create: 30,
          comment_create: 30,
        },
        eventCategories: {
          social: 50,
          engagement: 100,
        },
        subjectTypes: {},
        contentInteractions: 0,
        socialInteractions: 50,
        systemInteractions: 0,
        engagementInteractions: 100,
        topUsers: {
          user1: 25,
          user2: 20,
          user3: 15,
        },
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getUserEngagement(query);

      expect(mockAnalyticsService.getDashboardOverview).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual({
        topUsers: mockDashboardData.topUsers,
        uniqueUsers: mockDashboardData.uniqueUsers,
        socialInteractions: mockDashboardData.socialInteractions,
        engagementInteractions: mockDashboardData.engagementInteractions,
        eventTypes: mockDashboardData.eventTypes,
      });
    });

    it('should return user engagement with no social interactions', async () => {
      const query: DashboardQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockDashboardData = {
        totalEvents: 50,
        uniqueUsers: 10,
        timeSeries: [],
        eventTypes: { page_view: 50 },
        eventCategories: { system: 50 },
        subjectTypes: {},
        contentInteractions: 0,
        socialInteractions: 0,
        systemInteractions: 50,
        engagementInteractions: 0,
        topUsers: {},
        topContent: {},
      };

      mockAnalyticsService.getDashboardOverview.mockResolvedValue(
        mockDashboardData,
      );

      const result = await controller.getUserEngagement(query);

      expect(result).toEqual({
        topUsers: {},
        uniqueUsers: 10,
        socialInteractions: 0,
        engagementInteractions: 0,
        eventTypes: { page_view: 50 },
      });
    });
  });

  describe('getWidgetTitle', () => {
    it('should return correct widget titles for different widget types', () => {
      const testCases = [
        { widgetType: 'overview', expected: 'Analytics Overview' },
        { widgetType: 'user_activity', expected: 'User Activity' },
        { widgetType: 'content_performance', expected: 'Content Performance' },
        { widgetType: 'engagement_metrics', expected: 'Engagement Metrics' },
        { widgetType: 'traffic_sources', expected: 'Traffic Sources' },
        { widgetType: 'device_analytics', expected: 'Device Analytics' },
        { widgetType: 'geographic_data', expected: 'Geographic Data' },
        { widgetType: 'conversion_funnel', expected: 'Conversion Funnel' },
        { widgetType: 'retention_analysis', expected: 'Retention Analysis' },
        { widgetType: 'revenue_metrics', expected: 'Revenue Metrics' },
        { widgetType: 'unknown_widget', expected: 'Analytics Widget' },
      ];

      testCases.forEach(({ widgetType, expected }) => {
        const result = (controller as any).getWidgetTitle(widgetType);
        expect(result).toBe(expected);
      });
    });
  });
});
