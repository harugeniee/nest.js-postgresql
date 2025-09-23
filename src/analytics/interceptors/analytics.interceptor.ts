import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { TRACK_EVENT_KEY } from 'src/analytics/decorators/track-event.decorator';

/**
 * Analytics Interceptor
 *
 * Interceptor that automatically tracks analytics events for decorated methods
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
          try {
            // Track the event with basic information
            this.analyticsService
              .trackEvent(
                {
                  eventType: trackEventData.eventType,
                  eventCategory: trackEventData.eventCategory,
                  subjectType: trackEventData.subjectType,
                  subjectId: request?.params?.id || response?.id,
                  eventData: {
                    method: request?.method || 'UNKNOWN',
                    url: request?.url || 'UNKNOWN',
                    userAgent: request?.headers?.['user-agent'] || 'UNKNOWN',
                    ipAddress: request?.ip || 'UNKNOWN',
                    responseStatus: response?.status || 200,
                  },
                },
                request?.user?.uid,
                request?.sessionId || request?.headers?.['x-session-id'],
              )
              .catch((error) => {
                console.error('Analytics tracking error:', error);
              });
          } catch (error) {
            console.error('Analytics tracking error:', error);
          }
        }),
      );
    }

    return next.handle();
  }
}
