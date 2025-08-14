# BaseService for NestJS + TypeORM + Redis

This BaseService centralizes CRUD, pagination (offset and cursor), caching, transactions, and error mapping while reusing existing project utilities:

- DTOs: `AdvancedPaginationDto`, `CursorPaginationDto`
- Filtering: `ConditionBuilder.build(...)` (source of truth)
- Pagination envelope: `PaginationFormatter.offset(...)` returning `IPagination<T>`

It integrates Redis cache through the existing `CacheService` and emits optional typed events if an event emitter exists (feature-flag placeholder).

## Key behaviors

- Uses `ConditionBuilder.build` exactly to construct where filters.
- Offset listing returns `IPagination<T>` using `PaginationFormatter.offset`.
- Cursor listing respects filters and adds opaque cursors.
- Redis cache for id and list keys. Invalidate on mutations.
- Error mapping for common Postgres codes (23505/23503) and NotFound.
- Transaction helper using TypeORM `QueryRunner`.
- Optional whitelists for relations and select fields.

## Usage

Extend `BaseService<T>` in your feature service:

```ts
@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    cacheService: CacheService,
  ) {
    super(new TypeOrmBaseRepository(userRepo), {
      entityName: 'User',
      relationsWhitelist: ['sessions', 'profile'],
      cache: { enabled: true, ttlSec: 60, prefix: 'users', swrSec: 30 },
      defaultSearchField: 'name',
    }, cacheService);
  }

  protected override getSearchableColumns() {
    return ['email', 'name'] as (keyof User)[];
  }
}
```

### Offset listing

```ts
const page = await this.listOffset(paginationDto);
```

### Cursor listing

```ts
const { data, nextCursor } = await this.listCursor(cursorDto);
```

### Transactions

```ts
await this.runInTransaction(async (qr) => {
  const entity = this.repo.create(payload);
  await this.repo.save(entity, { queryRunner: qr });
});
```

### Cache invalidation

Cache is invalidated automatically on create/update/delete/restore:

- Deletes `${prefix}:id:${id}`
- Deletes list keys by `${prefix}:list:*`


