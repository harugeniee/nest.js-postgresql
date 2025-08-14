# BaseService for NestJS + TypeORM + Redis

This layer provides a reusable `BaseRepository` and `BaseService` to standardize CRUD, pagination (offset and cursor), i18n-aware errors, and Redis caching while reusing the project's existing helpers.

## Extending BaseService

Create a service that extends `BaseService<T>`:

```ts
export class UsersService extends BaseService<User> {
  constructor(repo: BaseRepository<User>, cache: CacheService) {
    super(repo, {
      entityName: 'users',
      cache: { enabled: true, ttlSec: 60, prefix: 'users' },
      defaultSearchField: 'name',
    }, cache);
  }
}
```

Options:
- `entityName`: logical name for cache keys and error messages
- `idKey`: primary id key, defaults to `id`
- `softDelete`: override auto-detection
- `relationsWhitelist`: allowed relations
- `selectWhitelist`: allowed select fields
- `cache`: `{ enabled, ttlSec, prefix?, swrSec? }`
- `defaultSearchField`: default column for LIKE search

## Pagination

- Offset: `listOffset(dto, extra?, qopts?, ctx?)` returns `IPagination<T>` via `PaginationFormatter.offset`.
- Cursor: `listCursor(dto, extra?, qopts?, ctx?)` returns a windowed payload with `nextCursor` and `prevCursor`.

Both use `ConditionBuilder.build(...)` for filtering.

## i18n and Errors

Pass i18n from controllers in `ctx.i18n`. Errors thrown by BaseService use `{ message, messageKey }` and are translated by the global exception filter.

## Transactions

Use `runInTransaction(qr => ...)` to perform atomic operations with a `QueryRunner`.

## Hooks

Override hooks in child services to implement custom behavior:

- `beforeCreate`, `afterCreate`
- `beforeUpdate`, `afterUpdate`
- `beforeDelete`, `afterDelete`
- `onListQueryBuilt`


