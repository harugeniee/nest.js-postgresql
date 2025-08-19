# Common Services

This directory contains common service classes that provide reusable business logic across the application.

## BaseService

The `BaseService` is a generic service that provides common CRUD operations and utilities for entities.

### Features

- **CRUD Operations**: Create, read, update, delete operations
- **Pagination**: Offset and cursor-based pagination
- **Caching**: Built-in caching with Redis
- **Transactions**: Database transaction support
- **Event Emission**: Domain event emission
- **Lifecycle Hooks**: Before/after operation hooks
- **Soft Delete**: Soft delete support
- **Batch Operations**: Create, update, and delete multiple entities

### Usage

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      cache: { enabled: true, prefix: 'user', ttlSec: 3600 },
      emitEvents: true,
      softDelete: true,
    }, cacheService);
  }

  // Override lifecycle hooks if needed
  protected async beforeCreate(data: DeepPartial<User>): Promise<DeepPartial<User>> {
    // Custom logic before creating user
    return data;
  }
}
```

## GraphQLBaseService

The `GraphQLBaseService` extends `BaseService` with GraphQL-specific optimizations and methods.

### Features

- **GraphQL Pagination**: Relay-style connection pagination with `first`/`after` and `last`/`before`
- **DataLoader Support**: Batch loading entities by IDs with preserved order
- **Field Selection**: Automatic field selection from GraphQL resolve info
- **Connection Formatting**: GraphQL connection response formatting
- **Batch Caching**: Optimized caching for batch operations
- **Type Safety**: Improved TypeScript type safety for GraphQL operations

### Important Notes

⚠️ **Repository Requirement**: Your repository must implement the `findByIds` method to use `GraphQLBaseService`. The service expects a repository that extends `BaseRepository` and implements this additional method.

### Usage

```typescript
@Injectable()
export class UserGraphQLService extends GraphQLBaseService<User> {
  constructor(
    protected readonly repo: GraphQLBaseRepository<User>, // Must implement findByIds
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      cache: { enabled: true, prefix: 'user', ttlSec: 3600 },
      emitEvents: true,
    }, cacheService);
  }

  // GraphQL pagination
  async getUsersConnection(pagination: GraphQLPaginationDto): Promise<GraphQLConnection<User>> {
    return this.listGraphQL(pagination);
  }

  // Batch loading for DataLoader
  async batchLoadUsers(ids: string[]): Promise<(User | null)[]> {
    return this.batchLoadByIds(ids);
  }

  // Field-optimized queries
  async getUserWithFields(
    id: string, 
    graphQLInfo: { fieldNodes: GraphQLFieldNode[] }
  ): Promise<User | null> {
    return this.findWithGraphQLFields(
      { id }, 
      graphQLInfo
    );
  }
}
```

### Repository Implementation

To use `GraphQLBaseService`, your repository must implement the `findByIds` method:

```typescript
@Injectable()
export class UserRepository implements BaseRepository<User> {
  // ... existing BaseRepository methods

  async findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<User>): Promise<User[]> {
    // Implementation for finding multiple users by IDs
    // This method is required by GraphQLBaseService
    return this.createQueryBuilder('user')
      .whereInIds(ids)
      .getMany();
  }
}
```

### GraphQL Pagination

The service supports Relay-style pagination:

```typescript
// Forward pagination
const firstPage = await service.listGraphQL({
  first: 10,
  after: undefined,
  sortBy: 'createdAt',
  order: 'DESC',
});

// Backward pagination
const lastPage = await service.listGraphQL({
  last: 10,
  before: 'cursor123',
  sortBy: 'createdAt',
  order: 'DESC',
});

// Response format
{
  edges: [
    { node: User, cursor: 'encoded_cursor' },
    // ...
  ],
  pageInfo: {
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    startCursor?: string,
    endCursor?: string,
  },
  totalCount: number,
}
```

### Field Selection

Automatically extracts selected fields from GraphQL queries with improved type safety:

```typescript
// GraphQL query
query {
  users {
    id
    name
    email
  }
}

// Service automatically selects only id, name, email fields
const users = await service.listWithGraphQLFields(
  pagination,
  graphQLInfo, // Contains field selection with proper typing
);
```

### Batch Loading

Optimized for GraphQL DataLoader pattern:

```typescript
// In your GraphQL resolver
const userLoader = new DataLoader(async (ids: string[]) => {
  return service.batchLoadByIds(ids);
});

// Usage
const user1 = await userLoader.load('1');
const user2 = await userLoader.load('2');
// Both are loaded in a single batch query
```

## Best Practices

1. **Extend BaseService** for REST API services
2. **Extend GraphQLBaseService** for GraphQL services (requires `findByIds` method in repository)
3. **Use lifecycle hooks** for business logic that should run before/after operations
4. **Enable caching** for frequently accessed data
5. **Use transactions** for operations that modify multiple entities
6. **Emit events** for domain events and integration points
7. **Implement required repository methods** when using GraphQLBaseService

## Configuration Options

### Cache Configuration

```typescript
cache: {
  enabled: true,
  prefix: 'user',
  ttlSec: 3600,
  swrSec: 300, // Stale-while-revalidate window
}
```

### Entity Configuration

```typescript
{
  entityName: 'User',
  idKey: 'id', // Default: 'id'
  softDelete: true, // Default: auto-detected
  relationsWhitelist: ['profile', 'posts'], // Allowed relations
  selectWhitelist: ['id', 'name', 'email'], // Allowed fields
  defaultSearchField: 'name', // Default search field
  emitEvents: true, // Enable event emission
}
```

## Testing

Both services include comprehensive test suites:

```bash
# Test BaseService
yarn test src/common/services/base.service.spec.ts

# Test GraphQLBaseService
yarn test src/common/services/graphql-base.service.spec.ts
```

## Migration from BaseService to GraphQLBaseService

If you have existing services that extend `BaseService` and want to add GraphQL support:

```typescript
// Before
export class UserService extends BaseService<User> { ... }

// After - requires repository with findByIds method
export class UserService extends GraphQLBaseService<User> { ... }

// All existing methods continue to work
// New GraphQL methods are available
```

### Required Repository Changes

When migrating to `GraphQLBaseService`, ensure your repository implements:

```typescript
// Add this method to your repository
async findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<T>): Promise<T[]> {
  // Implementation for batch loading by IDs
}
```

The `GraphQLBaseService` is fully backward compatible with `BaseService` but requires the additional `findByIds` method in your repository implementation.


