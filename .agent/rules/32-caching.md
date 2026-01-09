---
description: Caching strategies, key naming, and invalidation rules.
globs: "**/*"
alwaysApply: true
---
# Caching

## CacheService
Located at: `src/shared/services/cache/cache.service.ts`
- **Primitives**: `get`, `set`, `delete`, `exists`
- **Patterns**: `deleteKeysByPattern`, `findKeysByPattern`
- **Locks**: `setLock`, `releaseLock`

## Key Naming Convention
```
${prefix}:id:${id}              # Single entity
${prefix}:list:${hash}          # List with filters
${prefix}:stats:${identifier}   # Statistics
```

## Strategy
- **SWR**: Enable via `swrSec` in BaseService options for stale-while-revalidate.
- **Invalidation**: BaseService automatically invalidates on create/update/delete.
- **Custom Invalidation**: Override `afterCreate`/`afterUpdate`/`afterDelete`.

### Example
```typescript
protected async afterCreate(entity: Article): Promise<void> {
  await this.invalidateCacheForEntity(entity.id);
  await this.cacheService?.deleteKeysByPattern('articles:list:*');
  await this.cacheService?.deleteKeysByPattern('articles:stats:*');
}
```
