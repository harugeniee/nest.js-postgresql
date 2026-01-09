---
description: API standards, pagination, DTOs, and error handling.
globs: "**/*"
alwaysApply: true
---
# API Contract

## Pagination
### Offset-Based (Admin/Browsing)
- Method: `listOffset()`
- Response: `{ result: T[], metaData: { currentPage, pageSize, totalRecords, totalPages } }`

### Cursor-Based (Feeds/Infinite Scroll)
- Method: `listCursor()`
- **MUST** use signed cursors (`encodeSignedCursor`, `decodeSignedCursor`) from `src/common/utils/cursor.util.ts`.
- Response: `{ result: T[], metaData: { nextCursor, prevCursor, take, sortBy, order } }`
- **MUST NOT** expose numeric offsets.

## Validation (DTOs)
- Use `class-validator` + `class-transformer`.
- Cals `limit` to 1..100.

## Pipes
- `SnowflakeIdPipe` for ID parameters (validates 15-21 digit numeric strings).

## Error Handling
- Throw `HttpException` with `{ messageKey: 'domain.ERROR_KEY' }` for i18n.
- Use `I18nHttpExceptionFilter` (auto-applied globally).

```typescript
throw new HttpException(
  { messageKey: 'article.NOT_FOUND' },
  HttpStatus.NOT_FOUND,
);
```
