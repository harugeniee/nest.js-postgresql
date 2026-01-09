---
description: Controller patterns, analytics tracking, and thinness rules.
globs: "**/*.controller.ts"
alwaysApply: true
---
# Controllers

## Core Requirements
### MUST
- Keep thin: validate input, route to service, format response.
- Use `@Auth()` for protected routes.
- Use `SnowflakeIdPipe` for ID parameters.
- Use `@TrackEvent()` + `@UseInterceptors(AnalyticsInterceptor)` for CRUD endpoints.

### SHOULD
- Use `@RequirePermissions()` for fine-grained authorization.
- Apply class-level `@UseInterceptors(AnalyticsInterceptor)` when most endpoints need tracking.

## Analytics Tracking
All controllers MUST track important user actions (CRUD, social, engagement).

### Mapping
- **CONTENT**: articles, series, tags, media
- **SOCIAL**: follow, organizations, users
- **ENGAGEMENT**: comments, reactions, bookmarks
- **SYSTEM**: reports, auth

### Example
```typescript
@Controller('articles')
@UseInterceptors(AnalyticsInterceptor)
export class ArticlesController {
  @Post()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @Auth()
  create(@Body() dto: CreateArticleDto, @Request() req) {
    return this.articlesService.createArticle({ ...dto, userId: req.user.uid });
  }
}
```
