# Analytics Queue Implementation

## Overview

This document describes the implementation of asynchronous analytics tracking using RabbitMQ queue system to improve response time performance.

## Problem Solved

Previously, the `@TrackEvent` decorator was causing slow response times because:
- Database write operations were synchronous
- Analytics tracking blocked the main request flow
- Metrics updates were processed in the same thread

## Solution

The new implementation uses RabbitMQ queue to process analytics events asynchronously:

1. **Queue-based Processing**: Analytics events are sent to RabbitMQ queue instead of being processed synchronously
2. **Background Workers**: Dedicated worker processes handle analytics jobs
3. **Non-blocking**: Main request flow is not blocked by analytics processing

## Architecture

```
Request → Controller → @TrackEvent → AnalyticsInterceptor → RabbitMQ Queue → Worker → Database
```

## Components

### 1. AnalyticsQueueJob Interface
- Defines the structure of analytics jobs sent to queue
- Includes job metadata, event data, and request information

### 2. AnalyticsService Updates
- Added `trackEventAsync()` method for queue-based tracking
- Maintains backward compatibility with synchronous `trackEvent()`

### 3. WorkerController
- Added `handleAnalyticsTrack()` method to process analytics jobs
- Handles job acknowledgment and error management

### 4. WorkerService
- Added `processAnalyticsTrack()` method
- Processes analytics jobs and updates database/metrics

### 5. AnalyticsInterceptor
- Updated to use `trackEventAsync()` instead of `trackEvent()`
- Sends jobs to queue instead of processing synchronously

## Usage

### Basic Usage (No Changes Required)
```typescript
@Get(':id')
@TrackEvent('article_view', 'content', 'article')
@UseInterceptors(AnalyticsInterceptor)
findOne(@Param('id') id: string) {
  return this.articlesService.findById(id);
}
```

### Comprehensive Status Code Tracking

The interceptor now tracks **ALL** HTTP status codes, not just 200:

- **Success responses (200-299)**: Tracked as original event type
  - `article_view` for 200 OK
  - `article_view` for 201 Created
  - `article_view` for 204 No Content

- **Error responses (400-599)**: Tracked with `_error` suffix
  - `article_view_error` for 404 Not Found
  - `article_view_error` for 500 Internal Server Error
  - `article_view_error` for 403 Forbidden

### Error Information Captured

For error responses, additional information is captured:
```typescript
{
  eventType: 'article_view_error',
  eventCategory: 'content_error',
  eventData: {
    method: 'GET',
    url: '/api/articles/123',
    responseStatus: 404,
    errorMessage: 'Article not found',
    errorName: 'NotFoundException',
    errorStack: '...',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

### Manual Queue Usage
```typescript
// Send analytics event to queue
await this.analyticsService.trackEventAsync(
  {
    eventType: 'custom_event',
    eventCategory: 'user_action',
    subjectType: 'article',
    subjectId: '123',
    eventData: { customData: 'value' }
  },
  userId,
  sessionId,
  requestMetadata
);
```

## Configuration

### Environment Variables
```bash
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=analytics_queue
```

### Job Name Constants
```typescript
JOB_NAME.ANALYTICS_TRACK = 'analytics_track'
```

## Performance Benefits

1. **Faster Response Times**: Main request flow is not blocked by database writes
2. **Better Scalability**: Queue can handle high volumes of analytics events
3. **Fault Tolerance**: Failed analytics jobs can be retried
4. **Resource Optimization**: Analytics processing is distributed across worker processes

## Error Handling

- Queue failures are logged but don't affect main request flow
- Worker processes handle job failures with retry logic
- Analytics errors are isolated from business logic

## Monitoring

- Job processing times are logged
- Queue metrics can be monitored via RabbitMQ management interface
- Failed jobs are tracked and can be reprocessed

## Migration Notes

- Existing `@TrackEvent` decorators continue to work without changes
- AnalyticsInterceptor automatically uses queue-based processing
- Backward compatibility is maintained for direct service calls

## Future Enhancements

1. **Batch Processing**: Group multiple analytics events for efficient processing
2. **Priority Queues**: Different priority levels for different event types
3. **Dead Letter Queues**: Handle permanently failed jobs
4. **Metrics Dashboard**: Real-time monitoring of analytics processing
5. **Rate Limiting**: Prevent analytics queue from being overwhelmed
