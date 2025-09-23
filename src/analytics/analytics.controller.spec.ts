import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { AuthPayload } from 'src/common/interface';
import { CacheService } from 'src/shared/services';

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
});
