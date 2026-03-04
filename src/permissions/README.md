# Permission System

> Discord-style bitwise permission system with role hierarchy, scoped permissions, and Redis caching.

---

## Table of Contents

1. [Overview](#overview)
2. [Permission Key Format](#permission-key-format)
3. [Architecture](#architecture)
4. [Entities](#entities)
5. [Bitwise Operations](#bitwise-operations)
6. [Evaluation Flow](#evaluation-flow)
7. [Guard & Decorator](#guard--decorator)
8. [Context Resolvers](#context-resolvers)
9. [Caching](#caching)
10. [Adding New Permissions](#adding-new-permissions)
11. [Seeding](#seeding)
12. [Usage Examples](#usage-examples)

---

## Overview

The permission system implements a **Discord-style bitwise permission model** where:

- Each permission is a single bit in a BigInt bitmask (up to 64+ permissions in one integer)
- **Roles** bundle permissions via `allowPermissions` and `denyPermissions` bitmasks
- **Users** can be assigned multiple roles, plus individual permission overrides
- **Scopes** (organization, segment, article, etc.) allow context-specific permissions
- **Deny always overrides allow** at each precedence level
- All permission checks are **cached in Redis** for high performance

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| Single source of truth | All permission keys derived from `permission-definitions.ts` |
| Append-only | Never reorder components/actions — bit positions stored in DB |
| Deny wins | Deny overrides allow at every precedence level |
| Cache-first | Effective permissions cached in Redis (5 min TTL) |
| Batch evaluation | Load permission sources once, evaluate multiple keys |
| Facade pattern | `PermissionsService` delegates to focused sub-services |

### Performance Targets

- Cache hit rate: > 90%
- Evaluation time (cached): < 10ms
- Evaluation time (uncached): < 50ms

---

## Permission Key Format

Permission keys follow the `component.action` format.

### Source of Truth

File: `constants/permission-definitions.ts`

```typescript
// 9 components
export const PERMISSION_COMPONENTS = [
  'article', 'series', 'segment', 'organization',
  'team', 'project', 'media', 'sticker', 'report',
] as const;

// 4 actions
export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'] as const;

// Auto-derived: 9 x 4 = 36 permission keys
export const ALL_PERMISSION_KEYS = PERMISSION_COMPONENTS.flatMap((c) =>
  PERMISSION_ACTIONS.map((a) => `${c}.${a}` as const),
);
```

### Resulting Type

```typescript
type PermissionKey =
  | 'article.create' | 'article.read' | 'article.update' | 'article.delete'
  | 'series.create'  | 'series.read'  | 'series.update'  | 'series.delete'
  | 'segment.create' | 'segment.read' | 'segment.update' | 'segment.delete'
  | ... // 36 total
```

### Utility Functions

| Function | Purpose |
|----------|---------|
| `isPermissionKey(value)` | Type guard — validates string is a valid PermissionKey |
| `getComponent(key)` | Extract component from key (e.g., `'article'` from `'article.create'`) |
| `getAction(key)` | Extract action from key (e.g., `'create'` from `'article.create'`) |

### Individual Constants

For backward compatibility, individual constants are exported from `constants/permission-keys.constants.ts`:

```typescript
export const ARTICLE_CREATE = 'article.create' as const;
export const ARTICLE_READ = 'article.read' as const;
// ...etc
```

---

## Architecture

### Service Hierarchy

```
PermissionsService (Thin Facade)
│
├── RoleService              — Role CRUD + default role creation
├── UserRoleService          — User-role assignments
├── PermissionEvaluator      — Permission checks + effective permissions + caching
├── ScopePermissionService   — Scope-level permission grants/revocations
├── UserPermissionService    — Cache lifecycle management (init/refresh/clear)
├── ContextResolverService   — Auto-detect scope from HTTP requests
└── PermissionRegistry       — PermissionKey ↔ bit index mapping
```

### Service Responsibilities

| Service | File | Responsibility |
|---------|------|----------------|
| `PermissionsService` | `permissions.service.ts` | Thin facade — delegates all operations to sub-services |
| `PermissionEvaluator` | `services/permission-evaluator.service.ts` | Core evaluation engine: `evaluate()`, `evaluateBatch()`, `getEffectivePermissions()` |
| `RoleService` | `services/role.service.ts` | Role CRUD, extends `BaseService<Role>`, creates default roles per organization |
| `UserRoleService` | `services/user-role.service.ts` | Assign/remove roles, check role membership, eager-load role relations |
| `UserPermissionService` | `services/user-permission.service.ts` | Cache lifecycle: `initUserPermissions`, `refreshUserPermissions`, `clearUserPermissions` |
| `ScopePermissionService` | `services/scope-permission.service.ts` | Grant/revoke scope-level permissions using bitwise operations |
| `ContextResolverService` | `services/context-resolver.service.ts` | Register and execute context resolvers for auto scope detection |
| `PermissionRegistry` | `services/permission-registry.service.ts` | Maintain bidirectional mapping between PermissionKey and bit index |

### Module Configuration

```typescript
// permissions.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, UserPermission, ScopePermission]),
    CacheModule,
  ],
  providers: [
    PermissionsService,
    RoleService,
    UserRoleService,
    UserPermissionService,
    ContextResolverService,
    SegmentContextResolver,
    OrganizationContextResolver,
    ArticleContextResolver,
    PermissionRegistry,
    PermissionEvaluator,
    ScopePermissionService,
  ],
  exports: [
    PermissionsService,
    RoleService,
    UserRoleService,
    PermissionEvaluator,
    ScopePermissionService,
    ContextResolverService,
    PermissionRegistry,
    UserPermissionService,
  ],
})
export class PermissionsModule {}
```

---

## Entities

### Role

**Table**: `roles` | **File**: `entities/role.entity.ts`

Stores permissions as BigInt bitmasks (serialized as strings in PostgreSQL).

| Column | Type | Description |
|--------|------|-------------|
| `name` | `string` | Unique role name (e.g., `'admin'`, `'moderator'`) |
| `allowPermissions` | `string` | BigInt bitmask of allowed permissions |
| `denyPermissions` | `string` | BigInt bitmask of denied permissions |
| `position` | `number` | Hierarchy ordering (higher = more authority) |
| `color` | `string?` | Display color (hex) |
| `mentionable` | `boolean` | Whether role can be mentioned |
| `managed` | `boolean` | Whether system-managed (cannot be deleted) |
| `scopeType` | `string?` | Scope type if scoped role (null = global) |
| `scopeId` | `string?` | Scope ID if scoped role |

**Helper Methods**:
- `getAllowPermissionsAsBigInt()` / `setAllowPermissionsFromBigInt()`
- `getDenyPermissionsAsBigInt()` / `setDenyPermissionsFromBigInt()`
- `isAdmin()` — checks if role has all permissions (`~0n`)
- `isGlobal()` / `isScoped()`

### UserRole

**Table**: `user_roles` | **File**: `entities/user-role.entity.ts`

Junction table assigning roles to users.

| Column | Type | Description |
|--------|------|-------------|
| `userId` | `string` | User snowflake ID |
| `roleId` | `string` | Role snowflake ID |
| `isTemporary` | `boolean` | Whether assignment is temporary |
| `expiresAt` | `Date?` | Expiration timestamp |
| `assignedBy` | `string?` | ID of user who made the assignment |
| `reason` | `string?` | Reason for assignment |

**Constraints**: Unique on `(userId, roleId)` — one assignment per user-role pair.

**Helper Methods**: `isValid()` — checks not expired and not soft-deleted.

### UserPermission

**Table**: `user_permissions` | **File**: `entities/user-permission.entity.ts`

Granular per-user permission overrides (independent of roles).

| Column | Type | Description |
|--------|------|-------------|
| `userId` | `string` | User snowflake ID |
| `permission` | `string` | Permission name |
| `allowPermissions` | `string` | BigInt bitmask of allowed permissions |
| `denyPermissions` | `string` | BigInt bitmask of denied permissions |
| `contextType` | `string?` | Context type (e.g., `'organization'`, `'segment'`) |
| `contextId` | `string?` | Context snowflake ID |
| `expiresAt` | `Date?` | Expiration timestamp |
| `grantedBy` | `string?` | ID of user who granted |
| `reason` | `string?` | Reason for grant |

### ScopePermission

**Table**: `scope_permissions` | **File**: `entities/scope-permission.entity.ts`

Permissions attached to a resource (organization, team, project, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `scopeType` | `string` | Resource type (e.g., `'organization'`) |
| `scopeId` | `string` | Resource snowflake ID |
| `allowPermissions` | `string` | BigInt bitmask of allowed permissions |
| `denyPermissions` | `string` | BigInt bitmask of denied permissions |
| `permissionKey` | `string?` | Specific permission key (for single-permission grants) |
| `expiresAt` | `Date?` | Expiration timestamp |

**Constraints**: Unique on `(scopeType, scopeId, permissionKey)`.

---

## Bitwise Operations

### How It Works

Each permission key maps to a **bit index** (0-based, sequential). The `PermissionRegistry` maintains this mapping:

```
article.create  → bit 0  → mask 0b0001 (1n)
article.read    → bit 1  → mask 0b0010 (2n)
article.update  → bit 2  → mask 0b0100 (4n)
article.delete  → bit 3  → mask 0b1000 (8n)
series.create   → bit 4  → mask 0b10000 (16n)
...
report.delete   → bit 35 → mask (1n << 35n)
```

### PermissionRegistry API

```typescript
registry.getBitIndex('article.create');  // 0
registry.getBitMask('article.create');   // 1n (1n << 0n)
registry.getBitMasks(['article.create', 'article.read']);  // 3n (1n | 2n)
registry.getKeyByIndex(0);              // 'article.create'
```

### Evaluation Utilities

File: `utils/evaluation.util.ts`

```typescript
// Check if a specific bit is set
isBitSet(0b1010n, 1);  // true  (bit 1 is set)
isBitSet(0b1010n, 0);  // false (bit 0 is not set)

// Set/clear bits
setBit(0b1000n, 1);    // 0b1010n
clearBit(0b1010n, 1);  // 0b1000n

// Aggregate multiple bitmasks (OR)
aggregateAllowBitfields([0b0011n, 0b1100n]);  // 0b1111n

// Check permission status at a single level
checkPermissionStatus(allowBitfield, denyBitfield, bitIndex);
// → 'allow' | 'deny' | 'undefined'
// Deny has precedence: if bit set in deny, returns 'deny' regardless of allow

// Full precedence evaluation across all levels
evaluatePermissionWithPrecedence(
  scopeAllow, scopeDeny,
  roleAllow, roleDeny,
  userAllow, userDeny,
  bitIndex
);
// → { allowed: boolean, level: 'scope' | 'role' | 'user' | 'default' }
```

---

## Evaluation Flow

### 4-Level Precedence

```
┌─────────────────────────────────────────────┐
│  Level 1: SCOPE (highest priority)          │
│  ScopePermission for the target resource    │
│  If allow/deny is defined → use it          │
├─────────────────────────────────────────────┤
│  Level 2: ROLE                              │
│  Aggregate all user's roles (OR bitmasks)   │
│  If allow/deny is defined → use it          │
├─────────────────────────────────────────────┤
│  Level 3: USER                              │
│  Per-user permission overrides              │
│  If allow/deny is defined → use it          │
├─────────────────────────────────────────────┤
│  Level 4: DEFAULT                           │
│  No permission found → DENY                 │
└─────────────────────────────────────────────┘
```

**Key rule**: At each level, **deny overrides allow**. If a bit is set in both `allowPermissions` and `denyPermissions`, the result is **deny**.

### PermissionEvaluator Methods

```typescript
// Single permission check
const allowed = await evaluator.evaluate(
  userId,
  'article.create',
  'organization',    // optional scopeType
  organizationId,    // optional scopeId
);
// → true | false

// Batch check (optimized — loads sources once)
const results = await evaluator.evaluateBatch(
  userId,
  ['article.create', 'article.update', 'segment.read'],
  'organization',
  organizationId,
);
// → Map<PermissionKey, boolean>

// Get all effective permissions
const effective = await evaluator.getEffectivePermissions(
  userId,
  'organization',
  organizationId,
);
// → {
//     allowPermissions: '7',
//     denyPermissions: '0',
//     permissions: { 'article.create': 'allow', 'article.read': 'deny', ... },
//     permissionDetails: { 'article.create': { allowed: true, level: 'role' }, ... }
//   }
```

### Loading Permission Sources

`PermissionEvaluator.loadPermissionSources()` runs **3 parallel queries**:

```typescript
const [scopePermissions, userRoles, userPermissions] = await Promise.all([
  // 1. Scope permissions for the target resource
  scopePermissionService.find({ scopeType, scopeId }),
  // 2. User's roles (eager-loaded with Role entity)
  userRoleService.getUserRoles(userId),
  // 3. Per-user permission overrides
  userPermissionService.getUserPermissions(userId),
]);
```

Roles and user permissions are then **filtered in-memory** by scope context.

---

## Guard & Decorator

### @RequirePermissions Decorator

File: `src/common/decorators/permissions.decorator.ts`

```typescript
interface PermissionCheckOptions {
  all?: PermissionKey[];      // ALL must be granted (AND logic)
  any?: PermissionKey[];      // At least ONE must be granted (OR logic)
  none?: PermissionKey[];     // NONE must be granted (NOT logic)
  scopeType?: string;         // Explicit scope type
  scopeId?: string;           // Explicit scope ID
  autoDetectScope?: boolean;  // Auto-extract scope from request URL
}
```

### PermissionsGuard Flow

File: `src/auth/guard/permissions.guard.ts`

```
Request arrives
    │
    ▼
1. Read @RequirePermissions metadata from handler
    │ (none?) → ALLOW
    ▼
2. Validate user from request (AuthPayload)
    │ (invalid?) → 401 UnauthorizedException
    ▼
3. Check admin bypass (ADMIN or SUPER_ADMIN role)
    │ (admin?) → ALLOW
    ▼
4. Collect all permission keys from all/any/none
    │ (empty?) → ALLOW
    ▼
5. Resolve scope:
    │ ├── autoDetectScope? → ContextResolverService.autoDetectContext(request)
    │ ├── explicit scopeType/scopeId? → use directly
    │ └── legacy organizationId? → scope = ('organization', organizationId)
    ▼
6. Call PermissionEvaluator.evaluateBatch(userId, allKeys, scopeType, scopeId)
    │
    ▼
7. Enforce logic:
    ├── ALL: every key must be true  → else 403
    ├── ANY: at least one must be true → else 403
    └── NONE: every key must be false → else 403
    │
    ▼
8. ALLOW (all checks passed)
```

---

## Context Resolvers

### ContextResolverService

File: `services/context-resolver.service.ts`

Manages a registry of context resolvers that extract scope information from HTTP requests.

```typescript
interface IContextResolver {
  getContextType(): string;        // e.g., 'segment', 'organization'
  canHandle(request: Request): boolean;
  extractContext(request: Request): PermissionContext | undefined;
}

interface PermissionContext {
  type: string;   // scope type
  id: string;     // scope ID
}
```

### Built-in Resolvers

| Resolver | Context Type | Detection Pattern | Priority |
|----------|-------------|-------------------|----------|
| `SegmentContextResolver` | `segment` | `/segments/:id` in URL path | 1 (highest) |
| `ArticleContextResolver` | `article` | `/articles/:id` in URL path | 2 |
| `OrganizationContextResolver` | `organization` | `/organizations/:id` in URL path | 3 |

### Auto-Detection

When `autoDetectScope: true` is set in `@RequirePermissions`, the guard calls:

```typescript
const context = await contextResolverService.autoDetectContext(request);
// Tries resolvers in priority order: segment → article → organization
// Returns first match, or undefined if no resolver can handle the request
```

### Adding Custom Resolvers

```typescript
@Injectable()
export class MyContextResolver implements IContextResolver {
  getContextType() { return 'my-resource'; }

  canHandle(request: Request) {
    return request.url.includes('/my-resources/');
  }

  extractContext(request: Request) {
    const match = request.url.match(/\/my-resources\/(\d+)/);
    return match ? { type: 'my-resource', id: match[1] } : undefined;
  }
}
```

Register in `PermissionsModule` providers and inject into `ContextResolverService`.

---

## Caching

### Three Cache Layers

| Layer | Service | TTL | Key Pattern | Purpose |
|-------|---------|-----|-------------|---------|
| Effective permissions | `PermissionEvaluator` | 5 min | `permissions:effective:{userId}:{scopeType}:{scopeId}` | Caches computed effective permissions |
| User permissions | `UserPermissionService` | 1 hour | `user:permissions:{userId}[:org:{orgId}]` | Caches user's allow bitmask |
| Role cache | `RoleService` (via BaseService) | 5 min + 60s SWR | `permissions:role:id:{id}` | Caches role entities |

### Cache Lifecycle

```
User logs in (AuthService.login)
    │
    ▼
UserPermissionService.initUserPermissions(userId)  ← fire-and-forget
    │ Computes and caches effective permissions
    │
    ▼
User makes requests → PermissionsGuard
    │ evaluateBatch() → checks PermissionEvaluator cache
    │ Cache HIT → return cached result
    │ Cache MISS → load from DB, cache, return
    │
    ▼
Permission changes (role update, permission grant, etc.)
    │
    ▼
PermissionEvaluator.invalidateCache(userId, scopeType, scopeId)
    │ OR invalidateUserCache(userId) for all scopes
    │ OR invalidateScopeCache(scopeType, scopeId) for all users
    │
    ▼
User logs out (AuthService.logout / logoutAll)
    │
    ▼
UserPermissionService.clearUserPermissions(userId)
```

### Invalidation Triggers

| Event | Invalidation |
|-------|-------------|
| Role permissions updated | `invalidateUserCache()` for all affected users |
| Role assigned/removed | `invalidateUserCache(userId)` |
| Scope permission changed | `invalidateScopeCache(scopeType, scopeId)` |
| User permission granted/revoked | `invalidateUserCache(userId)` |
| User logout | `clearUserPermissions(userId)` |

---

## Adding New Permissions

### Adding a New Component

1. **Append** to `PERMISSION_COMPONENTS` in `constants/permission-definitions.ts`:

```typescript
export const PERMISSION_COMPONENTS = [
  'article', 'series', 'segment', 'organization',
  'team', 'project', 'media', 'sticker', 'report',
  'my-new-component',  // ← APPEND HERE (never insert in the middle!)
] as const;
```

This automatically creates 4 new permission keys: `my-new-component.create`, `my-new-component.read`, `my-new-component.update`, `my-new-component.delete`.

2. **Add individual constants** in `constants/permission-keys.constants.ts` (optional, for convenience):

```typescript
export const MY_NEW_COMPONENT_CREATE = 'my-new-component.create' as const;
export const MY_NEW_COMPONENT_READ = 'my-new-component.read' as const;
// ...
```

3. **Update seed** in `src/db/seed/permissions.seed.ts` if default roles need these new permissions.

### CRITICAL: Append-Only Rule

**NEVER** reorder or insert items in the middle of `PERMISSION_COMPONENTS` or `PERMISSION_ACTIONS`.

Bit indices are assigned sequentially based on array order. Reordering changes the mapping between permission keys and bit positions, which would **corrupt all existing bitmasks stored in the database**.

```
WRONG: Insert 'chat' before 'article'
  → 'article.create' shifts from bit 0 to bit 4
  → All stored bitmasks now mean different things

RIGHT: Append 'chat' at the end
  → Existing bit positions unchanged
  → 'chat.create' gets the next available bit index
```

---

## Seeding

File: `src/db/seed/permissions.seed.ts`

The seed script creates 6 default roles:

| Role | Position | Permissions | Color |
|------|----------|-------------|-------|
| `everyone` | 0 | None | — |
| `member` | 1 | None | — |
| `moderator` | 2 | Read/update articles, series, media, stickers, reports | `#ff7f00` |
| `admin` | 3 | All moderator + create articles/series/segments/stickers, organization management | `#ff0000` |
| `owner` | 4 | All permissions (`~0n`) | `#ffff00` |
| `uploader` | 5 | `segment.create`, `segment.update` | `#00ff00` |

Seed is idempotent — checks for existing roles before creating.

---

## Usage Examples

### Controller with Permission Check

```typescript
@Controller('articles')
@UseInterceptors(AnalyticsInterceptor)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @Auth()
  @RequirePermissions({ all: ['article.create'] })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Patch(':id')
  @Auth()
  @RequirePermissions({
    all: ['article.update'],
    autoDetectScope: true,  // auto-detect from /articles/:id
  })
  update(@Param('id', SnowflakeIdPipe) id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @Auth()
  @RequirePermissions({
    any: ['article.delete', 'report.delete'],  // moderators can delete via report
  })
  remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.articlesService.remove(id);
  }
}
```

### Direct Permission Check in Service

```typescript
@Injectable()
export class MyService {
  constructor(private readonly permissionEvaluator: PermissionEvaluator) {}

  async performAction(userId: string, organizationId: string) {
    const allowed = await this.permissionEvaluator.evaluate(
      userId,
      'segment.create',
      'organization',
      organizationId,
    );

    if (!allowed) {
      throw new ForbiddenException({
        messageKey: 'permission.INSUFFICIENT',
      });
    }

    // ... proceed with action
  }
}
```

### Batch Permission Check

```typescript
// Check multiple permissions at once (single DB load)
const results = await this.permissionEvaluator.evaluateBatch(
  userId,
  ['article.create', 'article.update', 'article.delete'],
  'organization',
  organizationId,
);

const canCreate = results.get('article.create');  // true/false
const canUpdate = results.get('article.update');  // true/false
const canDelete = results.get('article.delete');  // true/false
```

### Get All Effective Permissions

```typescript
const effective = await this.permissionEvaluator.getEffectivePermissions(
  userId,
  'organization',
  organizationId,
);

// effective.permissions = {
//   'article.create': 'allow',
//   'article.read': 'allow',
//   'article.update': 'deny',
//   'article.delete': 'undefined',
//   ...
// }
```

### Role Management

```typescript
// Create a role
const role = await permissionsService.createRole({
  name: 'editor',
  allowPermissions: '0',
  position: 2,
});

// Assign role to user
await permissionsService.assignRole({
  userId: '123456789',
  roleId: role.id,
  reason: 'Promoted to editor',
});

// Check if user has a role
const hasRole = await permissionsService.hasRoleName(userId, 'editor');
```

---

## File Structure

```
src/permissions/
├── permissions.module.ts              # Module registration
├── permissions.controller.ts          # REST API endpoints
├── permissions.service.ts             # Thin facade service
├── constants/
│   ├── permission-definitions.ts      # SINGLE SOURCE OF TRUTH
│   ├── permission-keys.constants.ts   # Individual key constants
│   └── permissions.constants.ts       # Default role names
├── entities/
│   ├── role.entity.ts                 # Role with bitmask fields
│   ├── user-role.entity.ts            # User-role junction
│   ├── user-permission.entity.ts      # Per-user overrides
│   └── scope-permission.entity.ts     # Resource-scoped permissions
├── dto/
│   ├── assign-role.dto.ts
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── effective-permissions.dto.ts
│   ├── grant-segment-permission.dto.ts
│   └── revoke-segment-permission.dto.ts
├── interfaces/
│   ├── context-resolver.interface.ts  # IContextResolver contract
│   └── effective-permissions.interface.ts
├── resolvers/
│   ├── segment-context.resolver.ts
│   ├── organization-context.resolver.ts
│   └── article-context.resolver.ts
├── services/
│   ├── permission-evaluator.service.ts  # Core evaluation engine
│   ├── permission-registry.service.ts   # Key ↔ bit index mapping
│   ├── role.service.ts                  # Role CRUD
│   ├── user-role.service.ts             # Role assignments
│   ├── user-permission.service.ts       # Cache lifecycle
│   ├── scope-permission.service.ts      # Scope-level grants
│   └── context-resolver.service.ts      # Auto scope detection
├── types/
│   └── permission-key.type.ts           # PermissionKey type export
└── utils/
    └── evaluation.util.ts               # Bitwise utility functions
```
