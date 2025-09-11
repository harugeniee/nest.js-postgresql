# Scheduled Publishing Feature Guide

## Overview

The scheduled publishing feature allows you to schedule articles for automatic publication at a desired future time. The system will automatically check and publish articles when their scheduled time arrives.

## Entity Changes

### 1. **Updated Status Enum**
```typescript
// Before
status: 'draft' | 'published' | 'archived'

// After
status: 'draft' | 'scheduled' | 'published' | 'archived'
```

### 2. **Added New Fields**
```typescript
// Scheduled publication time
@Index()
@Column({
  type: 'timestamp',
  nullable: true,
  comment: 'Date and time when article is scheduled to be published',
})
scheduledAt?: Date;

// Actual publication time (already exists)
@Index()
@Column({
  type: 'timestamp',
  nullable: true,
  comment: 'Date and time when article was actually published',
})
publishedAt?: Date;
```

## Usage

### 1. **Schedule Article Publication**

```typescript
// Schedule article for tomorrow at 9:00 AM
const scheduleDate = new Date();
scheduleDate.setDate(scheduleDate.getDate() + 1);
scheduleDate.setHours(9, 0, 0, 0);

await articlesService.scheduleArticle(articleId, {
  scheduledAt: scheduleDate,
  customSlug: 'optional-custom-slug' // Optional
});
```

### 2. **Reschedule Article**

```typescript
// Change scheduled time
const newScheduleDate = new Date();
newScheduleDate.setDate(newScheduleDate.getDate() + 2);
newScheduleDate.setHours(14, 30, 0, 0);

await articlesService.rescheduleArticle(articleId, {
  newScheduledAt: newScheduleDate
});
```

### 3. **Unschedule Article**

```typescript
// Cancel scheduling, revert to draft
await articlesService.unscheduleArticle(articleId);
```

### 4. **Publish Scheduled Article Immediately**

```typescript
// Publish scheduled article immediately
await articlesService.publishScheduledArticle(articleId);
```

### 5. **Update Article Status**

```typescript
// Change to scheduled status
await articlesService.updateStatus(articleId, {
  status: 'scheduled',
  scheduledAt: new Date('2024-12-25T10:00:00Z')
});

// Change to published status
await articlesService.updateStatus(articleId, {
  status: 'published'
});

// Revert to draft
await articlesService.updateStatus(articleId, {
  status: 'draft'
});
```

## API Endpoints (Examples)

### 1. **Schedule Article**
```http
POST /articles/{id}/schedule
Content-Type: application/json

{
  "scheduledAt": "2024-12-25T10:00:00Z",
  "customSlug": "optional-custom-slug"
}
```

### 2. **Reschedule Article**
```http
PUT /articles/{id}/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2024-12-26T15:30:00Z"
}
```

### 3. **Unschedule Article**
```http
DELETE /articles/{id}/schedule
```

### 4. **Publish Scheduled Article Immediately**
```http
POST /articles/{id}/publish-now
```

### 5. **Get Scheduled Articles List**
```http
GET /articles/scheduled?limit=20&offset=0
```

### 6. **Get Scheduling Statistics**
```http
GET /articles/scheduling-stats
```

## Automatic Cron Job

The system has a cron job that runs every minute to check and publish articles when their scheduled time arrives:

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async publishScheduledArticles(): Promise<void> {
  // Automatically publish articles that have reached their scheduled time
}
```

## Validation Rules

### 1. **Scheduled Time**
- Must be a future time
- Cannot be more than 1 year in the future
- Must be in ISO 8601 format

### 2. **Article Status**
- Can only schedule articles in `draft` status
- Cannot schedule articles that are already `published` or `archived`
- When scheduled, status changes to `scheduled`

## Database Indexes

Indexes are created to optimize performance:

```sql
-- Index for scheduledAt for fast queries
CREATE INDEX idx_article_scheduled_at ON articles(scheduledAt);

-- Index for publishedAt for fast queries  
CREATE INDEX idx_article_published_at ON articles(publishedAt);

-- Index for status for fast filtering
CREATE INDEX idx_article_status ON articles(status);
```

## Monitoring and Logging

### 1. **Automatic Logs**
```typescript
// Log when scheduling is successful
this.logger.log(`Article ${articleId} scheduled for publication at ${scheduledAt.toISOString()}`);

// Log when publishing is successful
this.logger.log(`Successfully published article ${articleId}`);

// Log when errors occur
this.logger.error(`Failed to publish article ${articleId}: ${error.message}`);
```

### 2. **Statistics**
```typescript
const stats = await articlesService.getSchedulingStats();
console.log(stats);
// {
//   totalScheduled: 5,
//   readyToPublish: 2,
//   nextScheduled: "2024-12-25T10:00:00Z"
// }
```

## Error Handling

### 1. **Common Errors**
```typescript
// Scheduled time in the past
throw new Error('Scheduled date must be in the future');

// Scheduling an already published article
throw new Error('Cannot schedule an already published article');

// Invalid slug
throw new Error('Invalid slug: Slug already exists. Suggestion: my-article-1');
```

### 2. **Error Handling in Cron Job**
```typescript
try {
  await this.publishArticle(article);
} catch (error) {
  this.logger.error(`Failed to publish article ${article.id}: ${error.message}`);
  // Don't stop processing other articles
}
```

## Best Practices

### 1. **Scheduling Time**
- Schedule at least 5-10 minutes in advance to ensure system processing time
- Avoid scheduling during peak hours (9:00, 12:00, 18:00) if you want to optimize performance

### 2. **Monitoring**
- Monitor logs to ensure cron job is working properly
- Check statistics regularly to detect issues early

### 3. **Backup**
- Always have a backup plan for important articles
- Test the scheduling feature before using it for real articles

## Real-world Examples

### 1. **Holiday Article Scheduling**
```typescript
// Schedule Christmas greeting article
const christmasDate = new Date('2024-12-25T00:00:00Z');
await articlesService.scheduleArticle(articleId, {
  scheduledAt: christmasDate,
  customSlug: 'chuc-mung-giang-sinh-2024'
});
```

### 2. **Series Article Scheduling**
```typescript
// Schedule series articles over 7 days
const articles = ['bai-1', 'bai-2', 'bai-3', 'bai-4', 'bai-5', 'bai-6', 'bai-7'];

for (let i = 0; i < articles.length; i++) {
  const scheduleDate = new Date();
  scheduleDate.setDate(scheduleDate.getDate() + i);
  scheduleDate.setHours(9, 0, 0, 0);
  
  await articlesService.scheduleArticle(articles[i], {
    scheduledAt: scheduleDate
  });
}
```

### 3. **Time Zone Scheduling**
```typescript
// Schedule article for Vietnam timezone (UTC+7)
const vietnamTime = new Date('2024-12-25T09:00:00+07:00');
await articlesService.scheduleArticle(articleId, {
  scheduledAt: vietnamTime
});
```

The scheduled publishing feature helps you manage content more proactively and professionally! 🚀
