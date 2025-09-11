# Hướng dẫn sử dụng tính năng Hẹn giờ đăng bài viết

## Tổng quan

Tính năng hẹn giờ đăng bài viết cho phép bạn lên lịch các bài viết để tự động xuất bản vào thời điểm mong muốn trong tương lai. Hệ thống sẽ tự động kiểm tra và xuất bản các bài viết đã đến thời gian.

## Các thay đổi trong Entity

### 1. **Cập nhật Status Enum**
```typescript
// Trước
status: 'draft' | 'published' | 'archived'

// Sau
status: 'draft' | 'scheduled' | 'published' | 'archived'
```

### 2. **Thêm các field mới**
```typescript
// Thời gian hẹn đăng bài
@Index()
@Column({
  type: 'timestamp',
  nullable: true,
  comment: 'Date and time when article is scheduled to be published',
})
scheduledAt?: Date;

// Thời gian thực tế đăng bài (đã có sẵn)
@Index()
@Column({
  type: 'timestamp',
  nullable: true,
  comment: 'Date and time when article was actually published',
})
publishedAt?: Date;
```

## Cách sử dụng

### 1. **Hẹn giờ đăng bài**

```typescript
// Hẹn giờ đăng bài vào ngày mai lúc 9:00
const scheduleDate = new Date();
scheduleDate.setDate(scheduleDate.getDate() + 1);
scheduleDate.setHours(9, 0, 0, 0);

await articlesService.scheduleArticle(articleId, {
  scheduledAt: scheduleDate,
  customSlug: 'optional-custom-slug' // Tùy chọn
});
```

### 2. **Thay đổi thời gian hẹn giờ**

```typescript
// Thay đổi thời gian hẹn giờ
const newScheduleDate = new Date();
newScheduleDate.setDate(newScheduleDate.getDate() + 2);
newScheduleDate.setHours(14, 30, 0, 0);

await articlesService.rescheduleArticle(articleId, {
  newScheduledAt: newScheduleDate
});
```

### 3. **Hủy hẹn giờ**

```typescript
// Hủy hẹn giờ, chuyển về draft
await articlesService.unscheduleArticle(articleId);
```

### 4. **Đăng ngay bài viết đã hẹn giờ**

```typescript
// Đăng ngay bài viết đã hẹn giờ
await articlesService.publishScheduledArticle(articleId);
```

### 5. **Cập nhật trạng thái bài viết**

```typescript
// Chuyển sang trạng thái scheduled
await articlesService.updateStatus(articleId, {
  status: 'scheduled',
  scheduledAt: new Date('2024-12-25T10:00:00Z')
});

// Chuyển sang trạng thái published
await articlesService.updateStatus(articleId, {
  status: 'published'
});

// Chuyển về draft
await articlesService.updateStatus(articleId, {
  status: 'draft'
});
```

## API Endpoints (Ví dụ)

### 1. **Hẹn giờ đăng bài**
```http
POST /articles/{id}/schedule
Content-Type: application/json

{
  "scheduledAt": "2024-12-25T10:00:00Z",
  "customSlug": "optional-custom-slug"
}
```

### 2. **Thay đổi thời gian hẹn giờ**
```http
PUT /articles/{id}/reschedule
Content-Type: application/json

{
  "newScheduledAt": "2024-12-26T15:30:00Z"
}
```

### 3. **Hủy hẹn giờ**
```http
DELETE /articles/{id}/schedule
```

### 4. **Đăng ngay bài viết đã hẹn giờ**
```http
POST /articles/{id}/publish-now
```

### 5. **Lấy danh sách bài viết đã hẹn giờ**
```http
GET /articles/scheduled?limit=20&offset=0
```

### 6. **Lấy thống kê hẹn giờ**
```http
GET /articles/scheduling-stats
```

## Cron Job tự động

Hệ thống có cron job chạy mỗi phút để kiểm tra và đăng các bài viết đã đến thời gian:

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async publishScheduledArticles(): Promise<void> {
  // Tự động đăng các bài viết đã đến thời gian
}
```

## Validation Rules

### 1. **Thời gian hẹn giờ**
- Phải là thời gian trong tương lai
- Không được quá 1 năm trong tương lai
- Phải là định dạng ISO 8601

### 2. **Trạng thái bài viết**
- Chỉ có thể hẹn giờ bài viết ở trạng thái `draft`
- Không thể hẹn giờ bài viết đã `published` hoặc `archived`
- Khi hẹn giờ, trạng thái sẽ chuyển thành `scheduled`

## Database Indexes

Các index được tạo để tối ưu hiệu suất:

```sql
-- Index cho scheduledAt để query nhanh
CREATE INDEX idx_article_scheduled_at ON articles(scheduledAt);

-- Index cho publishedAt để query nhanh  
CREATE INDEX idx_article_published_at ON articles(publishedAt);

-- Index cho status để filter nhanh
CREATE INDEX idx_article_status ON articles(status);
```

## Monitoring và Logging

### 1. **Logs tự động**
```typescript
// Log khi hẹn giờ thành công
this.logger.log(`Article ${articleId} scheduled for publication at ${scheduledAt.toISOString()}`);

// Log khi đăng bài thành công
this.logger.log(`Successfully published article ${articleId}`);

// Log khi có lỗi
this.logger.error(`Failed to publish article ${articleId}: ${error.message}`);
```

### 2. **Thống kê**
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

### 1. **Lỗi thường gặp**
```typescript
// Thời gian hẹn giờ trong quá khứ
throw new Error('Scheduled date must be in the future');

// Hẹn giờ bài viết đã đăng
throw new Error('Cannot schedule an already published article');

// Slug không hợp lệ
throw new Error('Invalid slug: Slug already exists. Suggestion: my-article-1');
```

### 2. **Xử lý lỗi trong cron job**
```typescript
try {
  await this.publishArticle(article);
} catch (error) {
  this.logger.error(`Failed to publish article ${article.id}: ${error.message}`);
  // Không dừng việc xử lý các bài viết khác
}
```

## Best Practices

### 1. **Thời gian hẹn giờ**
- Nên hẹn giờ trước ít nhất 5-10 phút để đảm bảo hệ thống có thời gian xử lý
- Tránh hẹn giờ vào giờ cao điểm (9:00, 12:00, 18:00) nếu muốn tối ưu hiệu suất

### 2. **Monitoring**
- Theo dõi logs để đảm bảo cron job hoạt động bình thường
- Kiểm tra thống kê định kỳ để phát hiện vấn đề sớm

### 3. **Backup**
- Luôn có kế hoạch backup cho các bài viết quan trọng
- Test tính năng hẹn giờ trước khi sử dụng cho bài viết thật

## Ví dụ thực tế

### 1. **Hẹn giờ đăng bài cho ngày lễ**
```typescript
// Hẹn giờ đăng bài chúc mừng Giáng sinh
const christmasDate = new Date('2024-12-25T00:00:00Z');
await articlesService.scheduleArticle(articleId, {
  scheduledAt: christmasDate,
  customSlug: 'chuc-mung-giang-sinh-2024'
});
```

### 2. **Hẹn giờ đăng bài series**
```typescript
// Hẹn giờ đăng bài series trong 7 ngày
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

### 3. **Hẹn giờ đăng bài theo múi giờ**
```typescript
// Hẹn giờ đăng bài theo múi giờ Việt Nam (UTC+7)
const vietnamTime = new Date('2024-12-25T09:00:00+07:00');
await articlesService.scheduleArticle(articleId, {
  scheduledAt: vietnamTime
});
```

Tính năng hẹn giờ đăng bài viết giúp bạn quản lý nội dung một cách chủ động và chuyên nghiệp hơn! 🚀
