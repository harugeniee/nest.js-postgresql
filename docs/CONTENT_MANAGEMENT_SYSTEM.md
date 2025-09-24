# 📝 Content Management System Documentation

## 📋 Overview

The Content Management System (CMS) is a comprehensive platform for creating, managing, and publishing content in the social media platform. It provides rich text editing, scheduled publishing, SEO optimization, and content analytics capabilities.

## 🎯 Key Features

### **Content Creation**
- **Rich Text Editor**: Markdown and HTML support
- **Media Integration**: Images, videos, and file attachments
- **Draft Management**: Save and manage drafts
- **Version Control**: Content versioning and history

### **Publishing System**
- **Scheduled Publishing**: Time-based content publishing
- **Content Status**: Draft, published, archived states
- **Visibility Controls**: Public, unlisted, private content
- **SEO Optimization**: Automatic slug generation and meta tags

### **Content Organization**
- **Tag System**: Content categorization and discovery
- **Bookmark System**: Save and organize content
- **Search Functionality**: Full-text search across content
- **Content Collections**: Group related content

### **Analytics & Insights**
- **View Tracking**: Content view counts and analytics
- **Engagement Metrics**: Likes, comments, bookmarks
- **Performance Analytics**: Content performance tracking
- **User Insights**: Author performance metrics

## 🏗️ Architecture

### **Core Components**

```
articles/
├── entities/
│   └── article.entity.ts              # Article database entity
├── dto/
│   ├── create-article.dto.ts          # Article creation DTO
│   ├── update-article.dto.ts          # Article update DTO
│   └── schedule-article.dto.ts        # Article scheduling DTO
├── services/
│   ├── scheduled-publishing.service.ts # Scheduled publishing
│   └── article-analytics.service.ts   # Content analytics
├── articles.controller.ts             # Article API endpoints
├── articles.service.ts                # Article business logic
└── articles.module.ts                 # Article module
```

### **Data Structure**

#### **Article Entity**
```typescript
@Entity('articles')
export class Article extends BaseEntityCustom {
  @PrimaryColumn('bigint')
  id!: string;

  @Column('bigint')
  authorId!: string;

  @Column('varchar', { length: 200 })
  title!: string;

  @Column('varchar', { length: 300 })
  slug!: string;

  @Column('text')
  content!: string;

  @Column('text', { nullable: true })
  excerpt?: string;

  @Column('varchar', { length: 20, default: 'draft' })
  status!: string; // 'draft', 'published', 'archived'

  @Column('varchar', { length: 20, default: 'public' })
  visibility!: string; // 'public', 'unlisted', 'private'

  @Column('jsonb', { nullable: true })
  metadata?: {
    featuredImage?: string;
    tags?: string[];
    categories?: string[];
    seoTitle?: string;
    seoDescription?: string;
    readingTime?: number;
  };

  @Column('timestamp', { nullable: true })
  publishedAt?: Date;

  @Column('timestamp', { nullable: true })
  scheduledAt?: Date;

  @Column('int', { default: 0 })
  viewCount!: number;

  @Column('int', { default: 0 })
  likeCount!: number;

  @Column('int', { default: 0 })
  commentCount!: number;

  @Column('int', { default: 0 })
  bookmarkCount!: number;

  @Column('jsonb', { nullable: true })
  analytics?: {
    lastViewedAt?: Date;
    averageReadTime?: number;
    bounceRate?: number;
    engagementScore?: number;
  };
}
```

## 🚀 Core Services

### **ArticlesService**

#### **Content Creation**
```typescript
// Create new article
async createArticle(createArticleDto: CreateArticleDto, authorId: string): Promise<Article>

// Update article
async updateArticle(id: string, updateArticleDto: UpdateArticleDto, authorId: string): Promise<Article>

// Delete article
async deleteArticle(id: string, authorId: string): Promise<void>

// Get article by ID
async getArticleById(id: string): Promise<Article>

// Get article by slug
async getArticleBySlug(slug: string): Promise<Article>
```

#### **Content Publishing**
```typescript
// Publish article
async publishArticle(id: string, authorId: string): Promise<Article>

// Unpublish article
async unpublishArticle(id: string, authorId: string): Promise<Article>

// Schedule article
async scheduleArticle(id: string, scheduledAt: Date, authorId: string): Promise<Article>

// Archive article
async archiveArticle(id: string, authorId: string): Promise<Article>
```

#### **Content Discovery**
```typescript
// Get published articles
async getPublishedArticles(query: ArticleQueryDto): Promise<PaginatedResult<Article>>

// Search articles
async searchArticles(query: string, filters?: ArticleFilters): Promise<PaginatedResult<Article>>

// Get articles by tag
async getArticlesByTag(tag: string, query: ArticleQueryDto): Promise<PaginatedResult<Article>>

// Get articles by author
async getArticlesByAuthor(authorId: string, query: ArticleQueryDto): Promise<PaginatedResult<Article>>
```

### **ScheduledPublishingService**

#### **Scheduled Publishing**
```typescript
// Process scheduled articles
async processScheduledArticles(): Promise<void>

// Get scheduled articles
async getScheduledArticles(): Promise<Article[]>

// Reschedule article
async rescheduleArticle(id: string, newScheduledAt: Date): Promise<Article>

// Cancel scheduled article
async cancelScheduledArticle(id: string): Promise<Article>
```

#### **Cron Jobs**
```typescript
// Check for scheduled articles every minute
@Cron('* * * * *')
async checkScheduledArticles(): Promise<void> {
  const scheduledArticles = await this.getScheduledArticles();
  
  for (const article of scheduledArticles) {
    if (article.scheduledAt <= new Date()) {
      await this.publishArticle(article.id, article.authorId);
    }
  }
}
```

### **ArticleAnalyticsService**

#### **Analytics Tracking**
```typescript
// Track article view
async trackView(articleId: string, userId?: string): Promise<void>

// Update engagement metrics
async updateEngagementMetrics(articleId: string): Promise<void>

// Get article analytics
async getArticleAnalytics(articleId: string): Promise<ArticleAnalytics>

// Get author analytics
async getAuthorAnalytics(authorId: string): Promise<AuthorAnalytics>
```

#### **Performance Metrics**
```typescript
// Calculate reading time
calculateReadingTime(content: string): number

// Calculate engagement score
calculateEngagementScore(article: Article): number

// Update view count
async incrementViewCount(articleId: string): Promise<void>

// Update reaction counts
async updateReactionCounts(articleId: string): Promise<void>
```

## 🔧 Content Features

### **Rich Text Editor**

#### **Markdown Support**
```typescript
// Convert markdown to HTML
convertMarkdownToHtml(markdown: string): string

// Extract plain text from markdown
extractPlainText(markdown: string): string

// Generate table of contents
generateTableOfContents(markdown: string): TableOfContentsItem[]
```

#### **HTML Support**
```typescript
// Sanitize HTML content
sanitizeHtml(html: string): string

// Extract images from HTML
extractImages(html: string): string[]

// Generate excerpt from HTML
generateExcerpt(html: string, maxLength: number): string
```

### **SEO Optimization**

#### **Slug Generation**
```typescript
// Generate unique slug
async generateSlug(title: string, existingId?: string): Promise<string>

// Validate slug uniqueness
async isSlugUnique(slug: string, excludeId?: string): Promise<boolean>

// Update slug
async updateSlug(articleId: string, newSlug: string): Promise<void>
```

#### **Meta Tags**
```typescript
// Generate meta description
generateMetaDescription(content: string, maxLength: number): string

// Generate SEO title
generateSeoTitle(title: string, maxLength: number): string

// Extract keywords
extractKeywords(content: string): string[]
```

### **Content Validation**

#### **Content Rules**
```typescript
// Validate article content
validateArticleContent(article: CreateArticleDto): ValidationResult

// Check content length
validateContentLength(content: string, minLength: number, maxLength: number): boolean

// Validate tags
validateTags(tags: string[]): ValidationResult

// Check for spam content
checkSpamContent(content: string): Promise<boolean>
```

## 📊 Content Analytics

### **View Analytics**
```typescript
// Track article views
async trackArticleView(articleId: string, userId?: string, ip?: string): Promise<void>

// Get view statistics
async getViewStats(articleId: string, timeRange: string): Promise<ViewStats>

// Get popular articles
async getPopularArticles(timeRange: string, limit: number): Promise<Article[]>

// Get trending articles
async getTrendingArticles(timeRange: string, limit: number): Promise<Article[]>
```

### **Engagement Analytics**
```typescript
// Get engagement metrics
async getEngagementMetrics(articleId: string): Promise<EngagementMetrics>

// Calculate engagement score
calculateEngagementScore(article: Article): number

// Get top performing articles
async getTopPerformingArticles(authorId: string, timeRange: string): Promise<Article[]>

// Get content insights
async getContentInsights(authorId: string): Promise<ContentInsights>
```

### **Author Analytics**
```typescript
// Get author statistics
async getAuthorStats(authorId: string): Promise<AuthorStats>

// Get content performance
async getContentPerformance(authorId: string): Promise<ContentPerformance>

// Get audience insights
async getAudienceInsights(authorId: string): Promise<AudienceInsights>

// Get content calendar
async getContentCalendar(authorId: string, month: string): Promise<ContentCalendar>
```

## 🔍 Content Discovery

### **Search Functionality**
```typescript
// Full-text search
async searchContent(query: string, filters: SearchFilters): Promise<SearchResult>

// Advanced search
async advancedSearch(criteria: AdvancedSearchCriteria): Promise<SearchResult>

// Search suggestions
async getSearchSuggestions(query: string): Promise<string[]>

// Search analytics
async trackSearchQuery(query: string, userId?: string): Promise<void>
```

### **Content Filtering**
```typescript
// Filter by tags
async filterByTags(tags: string[], query: ArticleQueryDto): Promise<PaginatedResult<Article>>

// Filter by category
async filterByCategory(category: string, query: ArticleQueryDto): Promise<PaginatedResult<Article>>

// Filter by date range
async filterByDateRange(startDate: Date, endDate: Date, query: ArticleQueryDto): Promise<PaginatedResult<Article>>

// Filter by author
async filterByAuthor(authorId: string, query: ArticleQueryDto): Promise<PaginatedResult<Article>>
```

### **Content Recommendations**
```typescript
// Get related articles
async getRelatedArticles(articleId: string, limit: number): Promise<Article[]>

// Get recommended articles
async getRecommendedArticles(userId: string, limit: number): Promise<Article[]>

// Get trending content
async getTrendingContent(timeRange: string, limit: number): Promise<Article[]>

// Get personalized feed
async getPersonalizedFeed(userId: string, limit: number): Promise<Article[]>
```

## 🏷️ Tag System Integration

### **Tag Management**
```typescript
// Add tags to article
async addTags(articleId: string, tags: string[]): Promise<void>

// Remove tags from article
async removeTags(articleId: string, tags: string[]): Promise<void>

// Get article tags
async getArticleTags(articleId: string): Promise<Tag[]>

// Get popular tags
async getPopularTags(limit: number): Promise<Tag[]>

// Get tag suggestions
async getTagSuggestions(content: string): Promise<string[]>
```

### **Tag Analytics**
```typescript
// Get tag statistics
async getTagStats(tag: string): Promise<TagStats>

// Get trending tags
async getTrendingTags(timeRange: string): Promise<Tag[]>

// Get tag performance
async getTagPerformance(tag: string): Promise<TagPerformance>
```

## 📚 Content Collections

### **Collection Management**
```typescript
// Create collection
async createCollection(name: string, description: string, authorId: string): Promise<Collection>

// Add article to collection
async addToCollection(collectionId: string, articleId: string): Promise<void>

// Remove article from collection
async removeFromCollection(collectionId: string, articleId: string): Promise<void>

// Get collection articles
async getCollectionArticles(collectionId: string): Promise<Article[]>

// Get user collections
async getUserCollections(userId: string): Promise<Collection[]>
```

## 🔒 Content Moderation

### **Content Review**
```typescript
// Flag content
async flagContent(articleId: string, reason: string, userId: string): Promise<void>

// Review flagged content
async reviewFlaggedContent(articleId: string, action: string, moderatorId: string): Promise<void>

// Get flagged content
async getFlaggedContent(): Promise<FlaggedContent[]>

// Moderate content
async moderateContent(articleId: string, action: string, moderatorId: string): Promise<void>
```

### **Content Policies**
```typescript
// Check content policy
async checkContentPolicy(content: string): Promise<PolicyCheckResult>

// Apply content filters
async applyContentFilters(content: string): Promise<string>

// Check for inappropriate content
async checkInappropriateContent(content: string): Promise<boolean>
```

## 🚀 API Endpoints

### **Article Management**
```typescript
// Create article
POST /api/articles
Authorization: Bearer <token>
Body: { title, content, tags, visibility, scheduledAt }

// Get article
GET /api/articles/:id
Query: ?include=author,tags,analytics

// Update article
PUT /api/articles/:id
Authorization: Bearer <token>
Body: { title, content, tags, visibility }

// Delete article
DELETE /api/articles/:id
Authorization: Bearer <token>
```

### **Content Discovery**
```typescript
// Search articles
GET /api/articles/search
Query: ?q=query&tags=tag1,tag2&author=authorId&limit=20&offset=0

// Get articles by tag
GET /api/articles/tag/:tag
Query: ?limit=20&offset=0

// Get trending articles
GET /api/articles/trending
Query: ?timeRange=week&limit=10

// Get recommended articles
GET /api/articles/recommended
Authorization: Bearer <token>
Query: ?limit=10
```

### **Analytics**
```typescript
// Get article analytics
GET /api/articles/:id/analytics
Authorization: Bearer <token>

// Get author analytics
GET /api/authors/:id/analytics
Authorization: Bearer <token>

// Get content insights
GET /api/authors/:id/insights
Authorization: Bearer <token>
```

## 🧪 Testing

### **Unit Tests**
```typescript
describe('ArticlesService', () => {
  it('should create article', async () => {
    const article = await service.createArticle({
      title: 'Test Article',
      content: 'Test content',
      tags: ['test']
    }, 'user1');

    expect(article).toBeDefined();
    expect(article.title).toBe('Test Article');
    expect(article.status).toBe('draft');
  });

  it('should generate unique slug', async () => {
    const slug1 = await service.generateSlug('Test Article');
    const slug2 = await service.generateSlug('Test Article');
    
    expect(slug1).not.toBe(slug2);
  });
});
```

### **Integration Tests**
```typescript
describe('Content Publishing', () => {
  it('should publish scheduled article', async () => {
    const article = await createScheduledArticle();
    
    await scheduledService.processScheduledArticles();
    
    const updatedArticle = await service.getArticleById(article.id);
    expect(updatedArticle.status).toBe('published');
  });
});
```

## 🎯 Future Enhancements

### **Planned Features**
- **Collaborative Editing**: Real-time collaborative editing
- **Content Templates**: Reusable content templates
- **Advanced Analytics**: ML-powered content insights
- **Content Scheduling**: Advanced scheduling options

### **Technical Improvements**
- **Content CDN**: Global content delivery
- **Content Versioning**: Advanced version control
- **Content Caching**: Enhanced caching strategies
- **Microservices**: Split into content microservice

---

**The Content Management System provides a comprehensive solution for content creation, management, and publishing with advanced features and excellent performance.**
