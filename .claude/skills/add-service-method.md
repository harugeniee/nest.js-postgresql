---
name: add-service-method
description: Add a new method to a service following BaseService patterns
user_invocable: true
---

# Add Service Method

Add new methods to existing services following the project's BaseService patterns.

## Instructions

When the user invokes this skill (e.g., `/add-service-method ArticlesService publishArticle`), generate the method.

## Common Method Patterns

### 1. Custom Find with Filters
```typescript
async findByStatus(
  status: ArticleStatus,
  pagination: CursorPaginationDto,
): Promise<IPaginationCursor<Article>> {
  const where = ConditionBuilder.build(
    { status },
    this.defaultSearchField,
    {},
  );

  return this.listCursor(pagination, { where });
}
```

### 2. Find with Relations
```typescript
async findWithAuthor(id: string): Promise<Article> {
  const article = await this.findById(id, {
    relations: { user: { avatar: true }, tags: true },
    select: {
      id: true,
      title: true,
      content: true,
      user: { id: true, username: true, avatar: { url: true } },
    },
  });

  if (!article) {
    throw new HttpException(
      { messageKey: 'article.NOT_FOUND' },
      HttpStatus.NOT_FOUND,
    );
  }

  return article;
}
```

### 3. Transactional Operation
```typescript
async publishArticle(id: string, userId: string): Promise<Article> {
  return this.runInTransaction(async (queryRunner) => {
    const article = await this.findById(id);

    if (!article) {
      throw new HttpException(
        { messageKey: 'article.NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.userId !== userId) {
      throw new HttpException(
        { messageKey: 'article.FORBIDDEN' },
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.update(
      id,
      {
        status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
        publishedAt: new Date(),
      },
      { queryRunner },
    );

    this.logger.log('Article published', { articleId: id, userId });

    return updated;
  });
}
```

### 4. Bulk Operation
```typescript
async bulkUpdateStatus(
  ids: string[],
  status: ArticleStatus,
): Promise<{ affected: number }> {
  const result = await this.updateMany(
    { id: In(ids) },
    { status },
  );

  this.logger.log('Bulk status update', {
    count: ids.length,
    status,
    affected: result.affected,
  });

  return { affected: result.affected || 0 };
}
```

### 5. Search with Multiple Fields
```typescript
async search(
  query: string,
  pagination: CursorPaginationDto,
): Promise<IPaginationCursor<Article>> {
  const searchableColumns = this.getSearchableColumns();

  const where = ConditionBuilder.build(
    {
      query,
      fields: searchableColumns,
      status: ARTICLE_CONSTANTS.STATUS.PUBLISHED,
    },
    this.defaultSearchField,
    { visibility: 'public' },
  );

  return this.listCursor(pagination, { where });
}
```

### 6. Aggregation/Count
```typescript
async getStatsByUser(userId: string): Promise<ArticleStats> {
  const cacheKey = `${this.cache?.prefix}:stats:${userId}`;

  // Check cache first
  if (this.cacheService && this.cache?.enabled) {
    const cached = await this.cacheService.get<ArticleStats>(cacheKey);
    if (cached) return cached;
  }

  const [published, draft, total] = await Promise.all([
    this.repo.count({ where: { userId, status: 'published' } }),
    this.repo.count({ where: { userId, status: 'draft' } }),
    this.repo.count({ where: { userId } }),
  ]);

  const stats = { published, draft, total };

  // Cache the result
  if (this.cacheService && this.cache?.enabled) {
    await this.cacheService.set(cacheKey, stats, this.cache.ttlSec);
  }

  return stats;
}
```

### 7. Soft Delete with Validation
```typescript
async safeDelete(id: string, userId: string): Promise<void> {
  const entity = await this.findById(id);

  if (!entity) {
    throw new HttpException(
      { messageKey: 'article.NOT_FOUND' },
      HttpStatus.NOT_FOUND,
    );
  }

  if (entity.userId !== userId) {
    throw new HttpException(
      { messageKey: 'article.FORBIDDEN' },
      HttpStatus.FORBIDDEN,
    );
  }

  await this.softDelete(id);
  this.logger.log('Article soft deleted', { articleId: id, userId });
}
```

### 8. Lifecycle Hook Override
```typescript
protected async afterCreate(entity: Article): Promise<void> {
  // Invalidate related caches
  await this.cacheService?.delete(`articles:user:${entity.userId}`);

  // Emit event for async processing
  this.eventEmitter?.emit('article.created', {
    articleId: entity.id,
    userId: entity.userId,
  });
}

protected async afterUpdate(entity: Article): Promise<void> {
  // Clear specific caches
  await this.cacheService?.deleteKeysByPattern(`articles:*:${entity.id}`);
}
```

## Required Imports

```typescript
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import { ConditionBuilder } from 'src/shared/helpers';
import { CursorPaginationDto } from 'src/common/dto';
import { IPaginationCursor } from 'src/common/interface';
```

## Error Handling Pattern

```typescript
// Always use i18n message keys
throw new HttpException(
  { messageKey: 'domain.ERROR_KEY' },
  HttpStatus.NOT_FOUND, // or appropriate status
);
```

## Logging Pattern

```typescript
// Use class logger
private readonly logger = new Logger(ServiceName.name);

// Log with context object
this.logger.log('Operation completed', { entityId, userId, action });
this.logger.warn('Unexpected state', { entityId, state });
this.logger.error('Operation failed', { entityId, error: error.message });
```

## Important Notes
- All business logic belongs in services, not controllers
- Use `runInTransaction()` for multi-step operations
- Always validate ownership before mutations
- Use `ConditionBuilder` for dynamic queries
- Leverage BaseService methods: `create`, `update`, `findById`, `listCursor`, `listOffset`
- Override lifecycle hooks for side effects (cache invalidation, events)
