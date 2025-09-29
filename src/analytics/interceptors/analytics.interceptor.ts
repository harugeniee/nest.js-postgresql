/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { TRACK_EVENT_KEY } from 'src/analytics/decorators/track-event.decorator';

/**
 * Analytics Interceptor
 *
 * Interceptor that automatically tracks analytics events for decorated methods
 * Now tracks ALL HTTP status codes including errors (404, 500, etc.)
 */
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const trackEventData = this.reflector.get(
      TRACK_EVENT_KEY,
      context.getHandler(),
    );

    if (trackEventData) {
      return next.handle().pipe(
        tap((response) => {
          // Track successful responses (including 200, 201, 204, etc.)
          this.trackAnalyticsEvent(
            trackEventData,
            request,
            response,
            response?.status || 200,
          );
        }),
        catchError((error) => {
          // Track error responses (404, 500, etc.)
          const statusCode = error?.status || error?.statusCode || 500;
          this.trackAnalyticsEvent(
            trackEventData,
            request,
            null,
            statusCode,
            error,
          );
          return throwError(() => error);
        }),
      );
    }

    return next.handle();
  }

  /**
   * Track analytics event with comprehensive error handling
   *
   * @param trackEventData - Event metadata from decorator
   * @param request - HTTP request object
   * @param response - HTTP response object (null for errors)
   * @param statusCode - HTTP status code
   * @param error - Error object (if any)
   */
  private trackAnalyticsEvent(
    trackEventData: any,
    request: any,
    response: any,
    statusCode: number,
    error?: any,
  ): void {
    try {
      // Determine event type based on status code
      let eventType = trackEventData.eventType;
      let eventCategory = trackEventData.eventCategory;

      // Modify event type for error cases
      if (statusCode >= 400) {
        eventType = `${trackEventData.eventType}_error`;
        eventCategory = `${trackEventData.eventCategory}_error`;
      }

      // Prepare event data with comprehensive information
      const eventData = {
        method: request?.method || 'UNKNOWN',
        url: request?.url || 'UNKNOWN',
        userAgent: request?.headers?.['user-agent'] || 'UNKNOWN',
        ipAddress: request?.ip || 'UNKNOWN',
        responseStatus: statusCode,
        timestamp: new Date().toISOString(),
        // Add error information if present
        ...(error && {
          errorMessage: error?.message || 'Unknown error',
          errorName: error?.name || 'Error',
          errorStack: error?.stack || null,
        }),
      };

      // Track the event asynchronously via queue
      this.analyticsService
        .trackEventAsync(
          {
            eventType,
            eventCategory,
            subjectType: trackEventData.subjectType,
            subjectId: request?.params?.id || response?.id,
            eventData,
          },
          request?.user?.uid,
          request?.user?.ssid,
          {
            method: request?.method || 'UNKNOWN',
            url: request?.url || 'UNKNOWN',
            userAgent: request?.headers?.['user-agent'] || 'UNKNOWN',
            ipAddress: request?.ip || 'UNKNOWN',
            responseStatus: statusCode,
          },
        )
        .catch((analyticsError) => {
          console.error('Analytics queue error:', analyticsError);
        });
    } catch (trackingError) {
      console.error('Analytics tracking error:', trackingError);
    }
  }
}
