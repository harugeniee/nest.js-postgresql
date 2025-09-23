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
            void this.analyticsService.trackEvent(
              {
                eventType: (trackEventData as any).eventType,
                eventCategory: (trackEventData as any).eventCategory,
                subjectType: (trackEventData as any).subjectType,
                subjectId: (request as any).params?.id || (response as any)?.id,
                eventData: {
                  method: (request as any).method || 'UNKNOWN',
                  url: (request as any).url || 'UNKNOWN',
                  userAgent:
                    (request as any).headers?.['user-agent'] || 'UNKNOWN',
                  ipAddress: (request as any).ip || 'UNKNOWN',
                  responseStatus: (response as any)?.status || 200,
                },
              },
              (request as any).user?.uid,
              (request as any).sessionId ||
                (request as any).headers?.['x-session-id'],
            );
          } catch (error) {
            console.error('Analytics tracking error:', error);
          }
        }),
      );
    }

    return next.handle();
  }
}
