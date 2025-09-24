import { SetMetadata } from '@nestjs/common';

/**
 * Track Event Decorator
 *
 * Decorator for marking controller methods that should track analytics events
 */
export const TRACK_EVENT_KEY = 'trackEvent';

/**
 * Track Event Decorator
 *
 * @param eventType - Type of event to track
 * @param eventCategory - Category of the event
 * @param subjectType - Type of subject (optional)
 * @returns Decorator function
 */
export const TrackEvent = (
  eventType: string,
  eventCategory: string,
  subjectType?: string,
) => SetMetadata(TRACK_EVENT_KEY, { eventType, eventCategory, subjectType });
