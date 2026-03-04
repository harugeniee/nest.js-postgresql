---
alwaysApply: true
---
# Cursor Rules — nest.js-postgresql

> Global, persistent context for AI coding assistants.
> **No migrations. No generators. Yarn only.**

---

## 0) General Principles

### MUST
- Develop within existing domain modules (`analytics`, `articles`, `auth`, `authors`, `badges`, `bookmarks`, `characters`, `comments`, `contributions`, `follow`, `key-value`, `media`, `notifications`, `organizations`, `permissions`, `rate-limit`, `reactions`, `reports`, `series`, `share`, `staffs`, `stickers`, `studios`, `tags`, `users`, `workers`).
- Keep controllers thin: validation + routing only; delegate ALL business logic to services.
- Use **Yarn exclusively** (`yarn add`, `yarn remove`, `yarn install`).
- Follow patterns established in `src/`, `src/shared/`, `src/common/`.

### MUST NOT
- Run generators (`nest g`, codegen) or migrations (`yarn migration:generate`, `yarn migration:run`).
- Use npm/pnpm for package management.
- Access `process.env` directly in feature modules (use ConfigService).

---

## 1) Entities

### MUST
- Extend `BaseEntityCustom` from `src/shared/entities/base.entity.ts`.
- Use explicit table names: `@Entity('table_name')` or `@Entity({ name: 'table_name' })` (plural snake_case).
- TypeScript properties and database columns both use camelCase (no naming strategy configured).

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Table names | plural snake_case | `users`, `articles`, `qr_tickets` |
| Properties/Columns | camelCase | `userId`, `createdAt`, `coverImageId` |
| Booleans | prefix `is`, `has`, `can` | `isActive`, `isEmailVerified` |
| Timestamps | suffix `At` | `publishedAt`, `scheduledAt` |
| Foreign keys (property) | `<parent>Id` | `userId`, `organizationId` |
| JoinColumn name | camelCase | `{ name: 'userId' }` |
| JoinTable (M2M) | snake_case | table: `article_tags`, columns: `article_id`, `tag_id` |

### BaseEntityCustom Provides
- `id` (Snowflake bigint), `uuid`, `createdAt`, `updatedAt`, `deletedAt`, `version`
- Methods: `toJSON()`, `isDeleted()`, `getAge()`, `getTimeSinceUpdate()`

### Example
```typescript
@Entity({ name: 'articles' })
@Index(['userId', 'createdAt'])
export class Article extends BaseEntityCustom {
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  // Many-to-many uses snake_case for join table
  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'article_tags',
    joinColumn: { name: 'article_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: Tag[];
}
```

---

## 2) Services

### MUST
- Extend `BaseService<T>` from `src/common/services/base.service.ts`.
- Configure: `entityName`, `cache`, `defaultSearchField`, `relationsWhitelist`, `selectWhitelist`, `idKey`, `softDelete`, `emitEvents`.
- Override `getSearchableColumns()` to define searchable fields.

### GraphQL Support (Available, Not Yet Adopted)
- `GraphQLBaseService<T>` exists at `src/common/services/graphql-base.service.ts` with GraphQL-specific pagination (connections/edges) and field selection.
- **No domain service currently extends it.** Tested in `graphql-base.service.spec.ts` but not yet used in production.
- When needed, extend `GraphQLBaseService<T>` following the same config pattern as `BaseService`.

### BaseService Provides
- **CRUD**: `create`, `createMany`, `update`, `updateMany`, `remove`, `removeMany`, `softDelete`, `softDeleteMany`, `restore`
- **Queries**: `findById`, `findOne`, `listOffset`, `listCursor`
- **Caching**: Redis with SWR pattern
- **Transactions**: `runInTransaction`
- **Lifecycle hooks**: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`

### Example
```typescript
@Injectable()
export class ArticlesService extends BaseService<Article> {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article) repo: Repository<Article>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Article>(repo),
      {
        entityName: 'Article',
        cache: { enabled: true, ttlSec: 60, prefix: 'articles', swrSec: 30 },
        defaultSearchField: 'title',
        relationsWhitelist: { user: { avatar: true }, coverImage: true },
        selectWhitelist: { id: true, title: true, user: { id: true, username: true } },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Article)[] {
    return ['title', 'summary', 'content'];
  }
}
```

---

## 3) Controllers

### MUST
- Keep thin: validate input, route to service, format response.
- Use `@Auth()` for protected routes.
- Use `SnowflakeIdPipe` for ID parameters.
- Use `@TrackEvent()` + `@UseInterceptors(AnalyticsInterceptor)` for CRUD endpoints.

### SHOULD
- Use `@RequirePermissions()` for fine-grained authorization.
- Apply class-level `@UseInterceptors(AnalyticsInterceptor)` when most endpoints need tracking.

### Decorators
| Decorator | Purpose | Import |
|-----------|---------|--------|
| `@Auth()` | JWT authentication | `src/common/decorators` |
| `@Auth(['admin'])` | Role-based access | `src/common/decorators` |
| `@RequirePermissions({ all: ['resource.action'] })` | Permission check | `src/common/decorators` |
| `@TrackEvent(type, category, subject)` | Analytics tracking | `src/analytics/decorators` |

### Example
```typescript
@Controller('articles')
@UseInterceptors(AnalyticsInterceptor)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @Auth()
  create(@Body() dto: CreateArticleDto, @Request() req: Request & { user: AuthPayload }) {
    return this.articlesService.createArticle({ ...dto, userId: req.user.uid });
  }

  @Get(':id')
  @Auth(undefined, true) // optional auth
  findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.articlesService.findById(id);
  }
}
```

---

## 4) Pagination

### Offset-Based
- Use `listOffset()` for admin panels, page-numbered browsing.
- Response: `{ result: T[], metaData: { currentPage, pageSize, totalRecords, totalPages } }`

### Cursor-Based
- Use `listCursor()` for feeds, infinite scroll.
- **MUST** use signed cursors (`encodeSignedCursor`, `decodeSignedCursor`) from `src/common/utils/cursor.util.ts`.
- Response: `{ result: T[], metaData: { nextCursor, prevCursor, take, sortBy, order } }`

### Exception
Custom methods outside BaseService MAY use unsigned cursors for internal/specialized use cases, but this should be rare and documented.

---

## 5) Caching

### CacheService (`src/shared/services/cache/cache.service.ts`)
- Primitives: `get`, `set`, `delete`, `exists`
- Patterns: `deleteKeysByPattern`, `findKeysByPattern`
- Locks: `setLock`, `releaseLock`
- SWR: `swrSec` for stale-while-revalidate

### Key Naming
```
${prefix}:id:${id}              # Single entity
${prefix}:list:${hash}          # List with filters
${prefix}:stats:${identifier}   # Statistics
```

### Invalidation
BaseService automatically invalidates on create/update/delete. Override `afterCreate`/`afterUpdate`/`afterDelete` for custom invalidation.

---

## 6) Query Building

### MUST
- Use `ConditionBuilder` from `src/shared/helpers/condition-builder.ts`.
- Never concatenate SQL strings manually.

### ConditionBuilder Supports
- Status filtering (`In`, `Not`)
- ID/user filtering
- Date ranges (`Between`, `MoreThanOrEqual`, `LessThanOrEqual`)
- Search (`ILike`, `Like`, JSONB)

```typescript
const where = ConditionBuilder.build(
  { status: 'published', query: 'search', fields: ['title'], fromDate, toDate },
  'title',         // default search field
  { visibility: 'public' }, // extra filters
);
```

---

## 7) Validation & Error Handling

### DTOs
- Use `class-validator` + `class-transformer` for all DTOs.
- Clamp `limit` to 1..100 in pagination DTOs.

### Pipes
- `SnowflakeIdPipe` for ID parameters (validates 15-21 digit numeric strings).

### Errors
- Throw `HttpException` with `{ messageKey: 'domain.ERROR_KEY' }` for i18n.
- Use `I18nHttpExceptionFilter` (auto-applied globally).

```typescript
throw new HttpException(
  { messageKey: 'article.NOT_FOUND' },
  HttpStatus.NOT_FOUND,
);
```

---

## 8) Authentication & Authorization

### Guards
| Guard | Purpose |
|-------|---------|
| `JwtAccessTokenGuard` | JWT access token validation |
| `JwtRefreshTokenGuard` | JWT refresh token validation |
| `RolesGuard` | Role-based access |
| `PermissionsGuard` | Permission-based access |
| `OptionalAuthGuard` | Optional authentication |
| `WebSocketAuthGuard` | WebSocket auth |

### Patterns
```typescript
@Auth()                              // Requires authentication
@Auth(['admin', 'moderator'])        // Requires specific roles
@Auth(undefined, true)               // Optional authentication
@RequirePermissions({ all: ['article.update'] })  // Permission check
```

---

## 9) Logging

### MUST
- Use `private readonly logger = new Logger(ClassName.name)`.
- Log IDs, operation names, timing—never passwords, tokens, or secrets.

### Levels
- `debug`: Development details
- `log`: Normal operations
- `warn`: Recoverable issues
- `error`: Failures requiring attention

```typescript
this.logger.log('Article created', { articleId: article.id });
this.logger.error('Failed to publish', { articleId, error: error.message });
```

---

## 10) Async Processing

### RabbitMQ
- **SHOULD** use for heavy async processing (notifications, analytics aggregation, media processing).
- Queue interfaces in `src/*/interfaces/*-queue.interface.ts`.

### EventEmitter
- Supported via `emitEvents` config in BaseService, but the project has largely moved to RabbitMQ.
- Most services explicitly set `emitEvents: false` (comments, reactions, reports, notifications). Only `BookmarkFolderService` currently enables it.
- **MAY** use for lightweight, in-process side effects that do not need retry/persistence, but prefer RabbitMQ for new features.

---

## 11) Module Structure

```
module-name/
├── module-name.module.ts       # TypeOrmModule.forFeature([Entity])
├── module-name.controller.ts   # Thin routes
├── module-name.service.ts      # Extends BaseService
├── entities/
│   └── *.entity.ts             # Extends BaseEntityCustom
├── dto/
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── get-*.dto.ts
└── services/                   # Additional specialized services
```

### Module Imports Pattern
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    AnalyticsModule,      // For @TrackEvent support
    PermissionsModule,    // For @RequirePermissions support
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
```

---

## 12) Infrastructure

| Component | Technology |
|-----------|------------|
| Framework | NestJS 11.x / TypeScript 5.x |
| Database | PostgreSQL / TypeORM 0.3.x |
| Cache | Redis (ioredis) |
| Queue | RabbitMQ |
| Auth | JWT + Firebase |
| IDs | Snowflake via `globalSnowflake.nextId()` |

### Configuration
- Centralized in `src/shared/config/` via `@nestjs/config`.
- Validated with Joi schemas.
- Access via `ConfigService`, never `process.env` directly.

---

## 13) Testing

| Type | Location | Command |
|------|----------|---------|
| Unit | `*.spec.ts` beside source | `yarn test` |
| E2E | `test/*.e2e-spec.ts` | `yarn test:e2e` |

### Best Practices
- Mock external deps (DB, cache, HTTP).
- Use `@nestjs/testing` utilities.
- Focus on business logic, not infrastructure.

---

## 14) Quick Reference

### File Naming
- Files: `kebab-case` (`create-article.dto.ts`)
- Classes: `PascalCase` (`CreateArticleDto`)
- Constants: `UPPER_SNAKE_CASE` (`ARTICLE_CONSTANTS`)

### Shared Code Locations
- `src/common/` — Cross-cutting (decorators, DTOs, filters, pipes, repositories, utils)
- `src/shared/` — Infrastructure (config, constants, entities, helpers, services)

### Key Utilities
| Utility | Location | Purpose |
|---------|----------|---------|
| `ConditionBuilder` | `src/shared/helpers` | Safe query building |
| `PaginationFormatter` | `src/shared/helpers` | Response formatting |
| `buildResponse` | `src/shared/helpers` | Standardized response with messageKey |
| `formatI18nResponse` | `src/shared/helpers` | i18n response translation |
| `encodeSignedCursor` | `src/common/utils/cursor.util.ts` | Secure cursors |
| `SnowflakeIdPipe` | `src/common/pipes` | ID validation |
| `CacheService` | `src/shared/services/cache` | Redis caching |
| `BaseService` | `src/common/services` | REST API base service |
| `GraphQLBaseService` | `src/common/services` | GraphQL base service (not yet adopted) |
| `sha256Hex` / `stableStringify` | `src/common/utils/hash.util.ts` | Hashing and stable serialization |
| `createSlug` | `src/common/utils/slug.util.ts` | Vietnamese-aware slug generation |
| `mapTypeOrmError` / `notFound` | `src/common/utils/error.util.ts` | TypeORM error mapping and 404 helpers |
| `normalizeSearchInput` | `src/common/utils/query.util.ts` | Search input normalization (NFC) |

---

## 15) Development Workflow

### Adding a Feature
1. Create entity extending `BaseEntityCustom` with explicit `@Entity('table_name')`.
2. Create DTOs with class-validator decorators.
3. Create service extending `BaseService` with whitelists and cache config.
4. Create thin controller with `@Auth()`, `@TrackEvent()`, `SnowflakeIdPipe`.
5. Register in module with required imports.
6. Write tests for business logic.

### Before PR
See `.cursor/rules/07-checklist.mdc` for the full acceptance checklist.

---

## Related Documentation

- `.cursor/rules/` — Detailed rule files for specific patterns:
  - `00-guardrails.mdc` — Hard guardrails (migrations, package management, controllers)
  - `03-refactor-safety.mdc` — Refactoring safety and backward compatibility
  - `04-query-and-filter.mdc` — ConditionBuilder usage and search validation
  - `05-pagination-contract.mdc` — Cursor and offset pagination contracts
  - `06-caching-contract.mdc` — Cache key naming, SWR, invalidation
  - `07-checklist.mdc` — PR acceptance checklist
  - `07-ddd-module-contract.mdc` — DDD module structure contract
  - `08-controller-event-tracking.mdc` — Analytics event tracking patterns
  - `modules/` — Module-specific rules (articles, bookmarks, comments, notifications, rate-limit, reactions, share, stickers, users)
