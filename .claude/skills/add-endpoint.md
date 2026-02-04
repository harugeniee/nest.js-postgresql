---
name: add-endpoint
description: Add a new API endpoint to a controller with proper decorators and tracking
user_invocable: true
---

# Add Endpoint

Add new API endpoints to controllers with proper authentication, tracking, and validation.

## Instructions

When the user invokes this skill (e.g., `/add-endpoint ArticlesController publish`), generate the endpoint.

## Endpoint Patterns

### 1. Protected POST (Create)
```typescript
@Post()
@Auth()
@TrackEvent(
  ANALYTICS_CONSTANTS.EVENT_TYPES.{ENTITY}_CREATE,
  ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
  ANALYTICS_CONSTANTS.SUBJECT_TYPES.{ENTITY},
)
create(
  @Body() dto: Create{EntityName}Dto,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.{serviceName}.create({ ...dto, userId: req.user.uid });
}
```

### 2. Public GET (List with Pagination)
```typescript
@Get()
@Auth(undefined, true) // Optional auth
findAll(@Query() query: Get{EntityName}Dto) {
  return this.{serviceName}.listCursor(query);
}
```

### 3. Public GET (Single by ID)
```typescript
@Get(':id')
@Auth(undefined, true) // Optional auth
findOne(@Param('id', SnowflakeIdPipe) id: string) {
  return this.{serviceName}.findById(id);
}
```

### 4. Protected PATCH (Update)
```typescript
@Patch(':id')
@Auth()
@TrackEvent(
  ANALYTICS_CONSTANTS.EVENT_TYPES.{ENTITY}_UPDATE,
  ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
  ANALYTICS_CONSTANTS.SUBJECT_TYPES.{ENTITY},
)
update(
  @Param('id', SnowflakeIdPipe) id: string,
  @Body() dto: Update{EntityName}Dto,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.{serviceName}.update(id, dto, req.user.uid);
}
```

### 5. Protected DELETE (Soft Delete)
```typescript
@Delete(':id')
@Auth()
@TrackEvent(
  ANALYTICS_CONSTANTS.EVENT_TYPES.{ENTITY}_DELETE,
  ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
  ANALYTICS_CONSTANTS.SUBJECT_TYPES.{ENTITY},
)
remove(
  @Param('id', SnowflakeIdPipe) id: string,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.{serviceName}.safeDelete(id, req.user.uid);
}
```

### 6. Action Endpoint (Custom Action)
```typescript
@Post(':id/publish')
@Auth()
@TrackEvent(
  ANALYTICS_CONSTANTS.EVENT_TYPES.{ENTITY}_PUBLISH,
  ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
  ANALYTICS_CONSTANTS.SUBJECT_TYPES.{ENTITY},
)
publish(
  @Param('id', SnowflakeIdPipe) id: string,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.{serviceName}.publish(id, req.user.uid);
}
```

### 7. Nested Resource (Sub-collection)
```typescript
@Get(':id/comments')
@Auth(undefined, true)
getComments(
  @Param('id', SnowflakeIdPipe) id: string,
  @Query() query: CursorPaginationDto,
) {
  return this.commentsService.findByArticle(id, query);
}

@Post(':id/comments')
@Auth()
addComment(
  @Param('id', SnowflakeIdPipe) articleId: string,
  @Body() dto: CreateCommentDto,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.commentsService.create({
    ...dto,
    articleId,
    userId: req.user.uid,
  });
}
```

### 8. Admin Only Endpoint
```typescript
@Get('admin/all')
@Auth(['admin'])
@RequirePermissions({ all: ['{entity}.admin.read'] })
findAllAdmin(@Query() query: AdvancedPaginationDto) {
  return this.{serviceName}.listOffset(query, { withDeleted: true });
}
```

### 9. Bulk Operation
```typescript
@Post('bulk/delete')
@Auth()
@RequirePermissions({ all: ['{entity}.bulk.delete'] })
bulkDelete(
  @Body() dto: BulkDeleteDto,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.{serviceName}.bulkDelete(dto.ids, req.user.uid);
}
```

### 10. File Upload
```typescript
@Post('upload')
@Auth()
@UseInterceptors(FileInterceptor('file'))
upload(
  @UploadedFile() file: Express.Multer.File,
  @Request() req: Request & { user: AuthPayload },
) {
  return this.mediaService.upload(file, req.user.uid);
}
```

## Required Imports

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth, RequirePermissions } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { TrackEvent } from 'src/analytics/decorators';
import { AnalyticsInterceptor } from 'src/analytics/interceptors';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants';
import { AuthPayload } from 'src/auth/interfaces';
import { CursorPaginationDto, AdvancedPaginationDto } from 'src/common/dto';
```

## Decorator Reference

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Auth()` | Require authentication | `@Auth()` |
| `@Auth(['admin'])` | Require specific roles | `@Auth(['admin', 'moderator'])` |
| `@Auth(undefined, true)` | Optional auth | Public with user info if logged in |
| `@RequirePermissions()` | Fine-grained access | `@RequirePermissions({ all: ['entity.action'] })` |
| `@TrackEvent()` | Analytics tracking | 3 params: type, category, subject |
| `@UseInterceptors()` | Apply interceptors | `AnalyticsInterceptor` |

## HTTP Method Guidelines

| Method | Use Case | Idempotent |
|--------|----------|------------|
| GET | Read/List resources | Yes |
| POST | Create/Action | No |
| PATCH | Partial update | No |
| PUT | Full replace | Yes |
| DELETE | Remove resource | Yes |

## Important Notes
- Controllers must be thin - delegate all logic to services
- Always use `SnowflakeIdPipe` for ID params
- Use `@TrackEvent()` for CRUD operations
- Apply `@UseInterceptors(AnalyticsInterceptor)` at class level
- Use proper HTTP methods and status codes
- Validate all inputs with DTOs
