import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AnalyticsInterceptor } from './analytics.interceptor';
import { AnalyticsService } from '../analytics.service';
import { TRACK_EVENT_KEY } from '../decorators/track-event.decorator';

describe('AnalyticsInterceptor', () => {
  let interceptor: AnalyticsInterceptor;

  const mockAnalyticsService = {
    trackEvent: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsInterceptor,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AnalyticsInterceptor>(AnalyticsInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;

    beforeEach(() => {
      const mockGetRequest = jest.fn().mockReturnValue({
        method: 'GET',
        url: '/articles/123',
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
          'x-session-id': 'session123',
        },
        ip: '192.168.1.1',
        params: { id: '123' },
        user: { uid: 'user123' },
      });

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: mockGetRequest,
        }),
        getHandler: jest.fn(),
      } as any;

      mockCallHandler = {
        handle: jest
          .fn()
          .mockReturnValue(of({ id: '123', title: 'Test Article' })),
      } as any;
    });

    it('should track event when decorator is present', (done) => {
      const trackEventData = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
      };

      mockReflector.get.mockReturnValue(trackEventData);
      mockAnalyticsService.trackEvent.mockResolvedValue({});

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(mockReflector.get).toHaveBeenCalledWith(
            TRACK_EVENT_KEY,
            mockExecutionContext.getHandler(),
          );
          expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
            {
              eventType: 'article_view',
              eventCategory: 'content',
              subjectType: 'article',
              subjectId: '123',
              eventData: {
                method: 'GET',
                url: '/articles/123',
                userAgent: 'Mozilla/5.0 Test Browser',
                ipAddress: '192.168.1.1',
                responseStatus: 200,
              },
            },
            'user123',
            'session123',
          );
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          done();
        },
        error: done,
      });
    });

    it('should not track event when decorator is not present', (done) => {
      mockReflector.get.mockReturnValue(undefined);

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(mockReflector.get).toHaveBeenCalledWith(
            TRACK_EVENT_KEY,
            mockExecutionContext.getHandler(),
          );
          expect(mockAnalyticsService.trackEvent).not.toHaveBeenCalled();
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          done();
        },
        error: done,
      });
    });

    it('should handle tracking errors gracefully', (done) => {
      const trackEventData = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
      };

      mockReflector.get.mockReturnValue(trackEventData);
      mockAnalyticsService.trackEvent.mockRejectedValue(
        new Error('Tracking failed'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Analytics tracking error:',
            expect.any(Error),
          );
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          consoleSpy.mockRestore();
          done();
        },
        error: done,
      });
    });

    it('should handle missing user context', (done) => {
      const trackEventData = {
        eventType: 'page_view',
        eventCategory: 'system',
      };

      const mockGetRequest = jest.fn().mockReturnValue({
        method: 'GET',
        url: '/',
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
        ip: '192.168.1.1',
        params: {},
        user: null,
      });

      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: mockGetRequest,
      });

      mockReflector.get.mockReturnValue(trackEventData);
      mockAnalyticsService.trackEvent.mockResolvedValue({});

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
            {
              eventType: 'page_view',
              eventCategory: 'system',
              subjectType: undefined,
              subjectId: undefined,
              eventData: {
                method: 'GET',
                url: '/',
                userAgent: 'Mozilla/5.0 Test Browser',
                ipAddress: '192.168.1.1',
                responseStatus: 200,
              },
            },
            undefined,
            undefined,
          );
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          done();
        },
        error: done,
      });
    });

    it('should handle missing session ID', (done) => {
      const trackEventData = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
      };

      const mockGetRequest = jest.fn().mockReturnValue({
        method: 'GET',
        url: '/articles/123',
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
        ip: '192.168.1.1',
        params: { id: '123' },
        user: { uid: 'user123' },
        sessionId: null,
      });

      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: mockGetRequest,
      });

      mockReflector.get.mockReturnValue(trackEventData);
      mockAnalyticsService.trackEvent.mockResolvedValue({});

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventType: 'article_view',
              eventCategory: 'content',
              subjectType: 'article',
              subjectId: '123',
            }),
            'user123',
            undefined,
          );
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          done();
        },
        error: done,
      });
    });

    it('should handle missing request data gracefully', (done) => {
      const trackEventData = {
        eventType: 'article_view',
        eventCategory: 'content',
        subjectType: 'article',
      };

      const mockGetRequest = jest.fn().mockReturnValue(null);

      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: mockGetRequest,
      });

      mockReflector.get.mockReturnValue(trackEventData);
      mockAnalyticsService.trackEvent.mockResolvedValue({});

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (response) => {
          expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith(
            {
              eventType: 'article_view',
              eventCategory: 'content',
              subjectType: 'article',
              subjectId: undefined,
              eventData: {
                method: 'UNKNOWN',
                url: 'UNKNOWN',
                userAgent: 'UNKNOWN',
                ipAddress: 'UNKNOWN',
                responseStatus: 200,
              },
            },
            undefined,
            undefined,
          );
          expect(response).toEqual({ id: '123', title: 'Test Article' });
          done();
        },
        error: done,
      });
    });
  });
});
