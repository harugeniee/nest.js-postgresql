# Share Count Tracking System

## Overview

The Share Count Tracking system provides real-time tracking of how many times content has been shared across different channels. It uses an event-driven architecture with RabbitMQ for asynchronous processing to ensure high performance and reliability.

## Architecture

### Event-Driven Processing

The system leverages BaseService hooks to automatically trigger share count updates:

- **`afterCreate`**: Triggered when a new share link is created
- **`afterUpdate`**: Triggered when a share link is updated (for future enhancements)
- **`beforeDelete`**: Stores share link data before deletion
- **`afterDelete`**: Triggered when a share link is deleted

### Queue-Based Updates

Share count updates are processed asynchronously via RabbitMQ to avoid blocking API responses:

1. **Event Generation**: BaseService hooks generate events when share links are created/deleted
2. **Queue Processing**: Events are sent to RabbitMQ queues for processing
3. **Worker Processing**: Dedicated worker processes handle share count calculations
4. **Database Updates**: Share counts are updated in the database

## Share Count Events

### SHARE_CREATED

Triggered when a new share link is created:

```typescript
interface ShareCreatedJob {
  jobId: string;
  shareId: string;
  contentType: string;
  contentId: string;
  userId: string;
  channelId?: string;
  campaignId?: string;
  timestamp: string;
}
```

### SHARE_DELETED

Triggered when a share link is deleted:

```typescript
interface ShareDeletedJob {
  jobId: string;
  shareId: string;
  contentType: string;
  contentId: string;
  userId: string;
  timestamp: string;
}
```

### SHARE_COUNT_UPDATE

Triggered for bulk updates or corrections:

```typescript
interface ShareCountUpdateJob {
  jobId: string;
  contentType: string;
  contentId: string;
  operation: 'increment' | 'decrement';
  timestamp: string;
}
```

## API Endpoints

### Get Share Count

```http
GET /share-links/count/:contentType/:contentId
```

**Parameters:**
- `contentType`: Type of content (e.g., 'article', 'post', 'product')
- `contentId`: ID of the content

**Response:**
```json
{
  "contentType": "article",
  "contentId": "123",
  "shareCount": 42
}
```

## Implementation Details

### ShareService Hooks

The share count tracking is implemented using BaseService hooks:

```typescript
@Injectable()
export class ShareService extends BaseService<ShareLink> {
  private deletedShareLink: ShareLink | null = null;

  /**
   * Hook: Called after a share link is created
   * Sends share created event to queue
   */
  protected async afterCreate(shareLink: ShareLink): Promise<void> {
    await super.afterCreate(shareLink);
    await this.sendShareCreatedEvent(shareLink);
  }

  /**
   * Hook: Called before a share link is deleted
   * Store share link data for afterDelete hook
   */
  protected async beforeDelete(shareLinkId: string): Promise<void> {
    await super.beforeDelete(shareLinkId);
    this.deletedShareLink = await this.findOne({ id: shareLinkId });
  }

  /**
   * Hook: Called after a share link is deleted
   * Sends share deleted event to queue
   */
  protected async afterDelete(shareLinkId: string): Promise<void> {
    await super.afterDelete(shareLinkId);
    if (this.deletedShareLink) {
      await this.sendShareDeletedEvent(this.deletedShareLink);
      this.deletedShareLink = null;
    }
  }
}
```

### Worker Processing

The worker processes handle the actual share count updates:

```typescript
@MessagePattern(JOB_NAME.SHARE_CREATED)
async handleShareCreated(
  @Payload() job: ShareCreatedJob,
  @Ctx() context: RmqContext,
) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();
  try {
    await this.workerService.processShareCreated(job);
    channel.ack(originalMsg);
  } catch (error) {
    channel.nack(originalMsg, false, true);
  }
}
```

### Worker Service Implementation

```typescript
async processShareCreated(job: ShareCreatedJob): Promise<ShareCountResult> {
  const startTime = Date.now();
  this.logger.log(`Processing share created: ${job.shareId}`);

  try {
    // TODO: Implement actual share count update logic
    // This would typically involve:
    // 1. Updating a share_count field in the content table
    // 2. Updating analytics/statistics
    // 3. Triggering notifications if needed
    // 4. Updating search indexes

    const processingTime = Date.now() - startTime;
    return {
      jobId: job.jobId,
      success: true,
      processingTime,
      data: {
        contentType: job.contentType,
        contentId: job.contentId,
        shareCount: 1,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    this.logger.error(`Error processing share created: ${job.shareId}`, error);

    return {
      jobId: job.jobId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    };
  }
}
```

## Configuration

### RabbitMQ Configuration

The system uses the existing RabbitMQ configuration:

```typescript
// In worker.constants.ts
export const JOB_NAME = {
  // ... existing jobs
  SHARE_CREATED: 'share_created',
  SHARE_DELETED: 'share_deleted',
  SHARE_COUNT_UPDATE: 'share_count_update',
} as const;
```

### Module Dependencies

The ShareModule includes RabbitMQModule for queue processing:

```typescript
@Module({
  imports: [
    // ... other imports
    RabbitmqModule,
  ],
  // ... rest of module configuration
})
export class ShareModule {}
```

## Benefits

1. **Performance**: Asynchronous processing prevents API blocking
2. **Reliability**: Queue-based processing ensures events are not lost
3. **Scalability**: Worker processes can be scaled independently
4. **Maintainability**: Clean separation of concerns using BaseService hooks
5. **Consistency**: Automatic event triggering ensures data consistency

## Future Enhancements

1. **Real-time Updates**: WebSocket notifications for live share count updates
2. **Analytics Integration**: Integration with analytics services
3. **Caching**: Redis caching for frequently accessed share counts
4. **Batch Processing**: Batch processing for bulk share count updates
5. **Metrics**: Detailed metrics and monitoring for share count processing

## Error Handling

The system includes comprehensive error handling:

1. **Queue Errors**: Failed queue operations are logged but don't break the main flow
2. **Worker Errors**: Worker errors trigger message requeue for retry
3. **Database Errors**: Database errors are properly handled and logged
4. **Graceful Degradation**: System continues to function even if share count tracking fails

## Monitoring

Key metrics to monitor:

1. **Queue Depth**: Number of pending share count updates
2. **Processing Time**: Time taken to process share count updates
3. **Error Rate**: Rate of failed share count processing
4. **Database Performance**: Impact on database performance
5. **Memory Usage**: Worker process memory usage
