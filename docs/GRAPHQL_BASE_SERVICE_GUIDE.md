# 🚀 GraphQL Base Service Complete Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Getting Started](#getting-started)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

`GraphQLBaseService` is a specialized service that extends `BaseService` with GraphQL-specific optimizations. It provides advanced features for GraphQL applications including Relay-style pagination, DataLoader support, field selection optimization, and relation filtering.

### Key Benefits

- ✅ **Relay Pagination**: Full Relay specification compliance
- ✅ **DataLoader Support**: Batch loading with preserved order
- ✅ **Field Selection**: Automatic field extraction from GraphQL queries
- ✅ **Relation Filtering**: Smart relation loading based on GraphQL selection
- ✅ **Performance**: Optimized for GraphQL's N+1 query problem
- ✅ **Type Safety**: Full TypeScript support with generics
- ✅ **Caching**: Advanced caching strategies for GraphQL workloads

---

## 🏗️ Architecture

### Class Hierarchy

```typescript
BaseService<T>
    ↓
GraphQLBaseService<T>
```

### Dependencies

- **BaseService<T>**: Inherits all base functionality
- **GraphQLBaseRepository<T>**: Repository with `findByIds` method
- **CacheService**: Redis caching (optional)
- **EventEmitter**: Domain events (optional)

### Key Components

1. **Relay Pagination**: Cursor-based pagination following Relay spec
2. **DataLoader Integration**: Batch loading with order preservation
3. **Field Selection**: GraphQL query field extraction
4. **Relation Filtering**: Smart relation loading based on GraphQL selection
5. **Connection Formatting**: GraphQL connection response formatting

---

## 🚀 Core Features

### 1. Relay Pagination

#### Connection Format
```typescript
interface GraphQLConnection<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount: number;
}
```

#### Usage
```typescript
// Forward pagination
const result = await service.listGraphQL({
  first: 10,
  after: 'cursor_string',
  sortBy: 'createdAt'
});

// Backward pagination
const result = await service.listGraphQL({
  last: 10,
  before: 'cursor_string',
  sortBy: 'createdAt'
});
```

### 2. DataLoader Support

#### Batch Loading
```typescript
// Load multiple entities by IDs with preserved order
const users = await service.findByIds(['1', '2', '3']);

// Returns: [User1, User2, User3] or [User1, null, User3] if User2 not found
```

#### Map-based Loading
```typescript
// Load entities and return as Map for efficient lookups
const userMap = await service.findByIdsMap(['1', '2', '3']);
const user = userMap.get('1'); // Direct lookup
```

### 3. Field Selection

#### Automatic Field Extraction
```typescript
// Automatically extracts fields from GraphQL query
const user = await service.findWithGraphQLFields(
  { id: '123' },
  graphQLInfo // GraphQL resolve info
);
```

#### Field Selection with Relations
```typescript
// Extract both fields and relations from GraphQL query
const user = await service.findWithGraphQLFieldsAndRelations(
  { id: '123' },
  graphQLInfo
);
```

### 4. Relation Filtering

#### Relations Whitelist
```typescript
{
  relationsWhitelist: {
    profile: true,
    roles: true,
    posts: {
      author: true,
      comments: {
        user: true
      }
    }
  }
}
```

#### GraphQL-aware Filtering
```typescript
// Only load relations that are requested in GraphQL query
const user = await service.findWithGraphQLFieldsAndRelations(
  { id: '123' },
  graphQLInfo // Will only load relations present in query
);
```

---

## 🚀 Getting Started

### 1. Repository Setup

```typescript
@Injectable()
export class UserRepository extends TypeOrmBaseRepository<User> implements GraphQLBaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(userRepo);
  }

  // Required for GraphQLBaseService
  async findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<User>): Promise<User[]> {
    return this.createQueryBuilder('user')
      .whereInIds(ids)
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'roles')
      .getMany();
  }
}
```

### 2. Service Setup

```typescript
@Injectable()
export class UserGraphQLService extends GraphQLBaseService<User> {
  constructor(
    protected readonly repo: UserRepository,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      cache: { enabled: true, ttlSec: 300, prefix: 'users' },
      emitEvents: true,
      defaultSearchField: 'name',
      relationsWhitelist: {
        profile: true,
        roles: {
          permissions: true
        },
        posts: {
          author: true,
          comments: true
        }
      },
      selectWhitelist: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    }, cacheService);
  }
}
```

### 3. Module Configuration

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CacheModule,
  ],
  providers: [
    UserRepository,
    UserGraphQLService,
  ],
  exports: [UserGraphQLService],
})
export class UserGraphQLModule {}
```

---

## 📖 API Reference

### Constructor Options

```typescript
interface GraphQLServiceOptions {
  entityName: string;                    // Entity name for events/logging
  idKey?: string;                       // Primary key field (default: 'id')
  softDelete?: boolean;                 // Enable soft delete (auto-detected)
  relationsWhitelist?: FindOptionsRelations<T>; // Allowed relations (object format)
  selectWhitelist?: FindOptionsSelect<T>; // Allowed select fields
  cache?: CacheOptions & { prefix?: string }; // Cache configuration
  emitEvents?: boolean;                 // Enable event emission
  defaultSearchField?: string;          // Default search field
}
```

### Core Methods

#### Data Loading
```typescript
// Batch load by IDs with preserved order
findByIds(ids: string[], opts?: QOpts<T>, ctx?: TxCtx): Promise<(T | null)[]>

// Batch load and return as Map
findByIdsMap(ids: string[], opts?: QOpts<T>, ctx?: TxCtx): Promise<Map<string, T>>

// Batch load with caching
batchLoadByIds(ids: string[], opts?: QOpts<T>, ctx?: TxCtx): Promise<(T | null)[]>
```

#### GraphQL Pagination
```typescript
// Relay-style pagination
listGraphQL(pagination: GraphQLPaginationDto, extraFilter?: Record<string, unknown>, opts?: QOpts<T>, ctx?: TxCtx): Promise<GraphQLConnection<T>>

// Pagination with field selection
listWithGraphQLFields(pagination: GraphQLPaginationDto, graphQLInfo: { fieldNodes: GraphQLFieldNode[] }, extraFilter?: Record<string, unknown>, opts?: QOpts<T>, ctx?: TxCtx): Promise<GraphQLConnection<T>>

// Pagination with field and relation selection
listWithGraphQLFieldsAndRelations(pagination: GraphQLPaginationDto, graphQLInfo: { fieldNodes: GraphQLFieldNode[] }, extraFilter?: Record<string, unknown>, opts?: QOpts<T>, ctx?: TxCtx): Promise<GraphQLConnection<T>>
```

#### Field Selection
```typescript
// Find with GraphQL field selection
findWithGraphQLFields(where: Parameters<this['findOne']>[0], graphQLInfo: { fieldNodes: GraphQLFieldNode[] }, opts?: QOpts<T>, ctx?: TxCtx): Promise<T | null>

// Find with field and relation selection
findWithGraphQLFieldsAndRelations(where: Parameters<this['findOne']>[0], graphQLInfo: { fieldNodes: GraphQLFieldNode[] }, opts?: QOpts<T>, ctx?: TxCtx): Promise<T | null>
```

#### Relation Management
```typescript
// Check if relation is allowed
isRelationAllowed(relation: string): boolean

// Get all allowed relations
getAllowedRelations(): string[]

// Filter relations for GraphQL
filterRelationsForGraphQL(graphQLInfo: { fieldNodes: GraphQLFieldNode[] }, opts?: QOpts<T>): string[] | FindOptionsRelations<T> | undefined
```

---

## 💡 Usage Examples

### 1. Basic GraphQL Resolver

```typescript
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserGraphQLService) {}

  @Query(() => UserConnection)
  async users(
    @Args() pagination: GraphQLPaginationDto,
    @Info() info: GraphQLResolveInfo,
  ): Promise<GraphQLConnection<User>> {
    return this.userService.listWithGraphQLFieldsAndRelations(
      pagination,
      { fieldNodes: info.fieldNodes },
    );
  }

  @Query(() => User, { nullable: true })
  async user(
    @Args('id') id: string,
    @Info() info: GraphQLResolveInfo,
  ): Promise<User | null> {
    return this.userService.findWithGraphQLFieldsAndRelations(
      { id },
      { fieldNodes: info.fieldNodes },
    );
  }
}
```

### 2. DataLoader Integration

```typescript
@Injectable()
export class UserDataLoader {
  constructor(private readonly userService: UserGraphQLService) {}

  createLoader(): DataLoader<string, User | null> {
    return new DataLoader(async (ids: string[]) => {
      return this.userService.findByIds(ids);
    });
  }

  createMapLoader(): DataLoader<string, User | null> {
    return new DataLoader(async (ids: string[]) => {
      const map = await this.userService.findByIdsMap(ids);
      return ids.map(id => map.get(id) || null);
    });
  }
}
```

### 3. Nested Relations

```typescript
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserGraphQLService) {}

  @ResolveField(() => [Post])
  async posts(
    @Parent() user: User,
    @Args() pagination: GraphQLPaginationDto,
    @Info() info: GraphQLResolveInfo,
  ): Promise<GraphQLConnection<Post>> {
    return this.userService.listWithGraphQLFieldsAndRelations(
      pagination,
      { fieldNodes: info.fieldNodes },
      { authorId: user.id }
    );
  }

  @ResolveField(() => UserProfile)
  async profile(
    @Parent() user: User,
    @Info() info: GraphQLResolveInfo,
  ): Promise<UserProfile | null> {
    // This will only load if profile is requested in GraphQL query
    const userWithProfile = await this.userService.findWithGraphQLFieldsAndRelations(
      { id: user.id },
      { fieldNodes: info.fieldNodes },
      { relations: ['profile'] }
    );
    
    return userWithProfile?.profile || null;
  }
}
```

### 4. Advanced Filtering

```typescript
@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserGraphQLService) {}

  @Query(() => UserConnection)
  async searchUsers(
    @Args('query') query: string,
    @Args() pagination: GraphQLPaginationDto,
    @Info() info: GraphQLResolveInfo,
  ): Promise<GraphQLConnection<User>> {
    return this.userService.listWithGraphQLFieldsAndRelations(
      pagination,
      { fieldNodes: info.fieldNodes },
      { query, status: 'ACTIVE' }
    );
  }

  @Query(() => UserConnection)
  async usersByRole(
    @Args('role') role: string,
    @Args() pagination: GraphQLPaginationDto,
    @Info() info: GraphQLResolveInfo,
  ): Promise<GraphQLConnection<User>> {
    return this.userService.listWithGraphQLFieldsAndRelations(
      pagination,
      { fieldNodes: info.fieldNodes },
      { 'roles.name': role }
    );
  }
}
```

---

## 🔧 Advanced Features

### 1. Custom Field Extraction

```typescript
@Injectable()
export class CustomUserGraphQLService extends GraphQLBaseService<User> {
  // Override field extraction for custom logic
  private extractFieldsFromGraphQLInfo(graphQLInfo: {
    fieldNodes: GraphQLFieldNode[];
  }): FindOptionsSelect<User> | undefined {
    // Custom field extraction logic
    const fields = super.extractFieldsFromGraphQLInfo(graphQLInfo);
    
    // Add custom fields based on user permissions
    if (this.currentUser?.role === 'ADMIN') {
      return {
        ...fields,
        internalNotes: true,
        auditLogs: true
      };
    }
    
    return fields;
  }
}
```

### 2. Dynamic Relations Based on Context

```typescript
@Injectable()
export class ContextAwareUserService extends GraphQLBaseService<User> {
  async getUserWithContextualRelations(
    userId: string,
    graphQLInfo: { fieldNodes: GraphQLFieldNode[] },
    context: 'public' | 'authenticated' | 'admin'
  ) {
    const relationsMap = {
      public: ['profile'],
      authenticated: ['profile', 'roles'],
      admin: ['profile', 'roles', 'sessions', 'auditLogs']
    };

    return this.findWithGraphQLFieldsAndRelations(
      { id: userId },
      graphQLInfo,
      { relations: relationsMap[context] }
    );
  }
}
```

### 3. Performance Optimization

```typescript
@Injectable()
export class OptimizedUserService extends GraphQLBaseService<User> {
  // Override batch loading for custom optimization
  async batchLoadByIds(
    ids: string[],
    opts?: QOpts<User>,
    ctx?: TxCtx,
  ): Promise<(User | null)[]> {
    // Custom batch loading logic
    if (ids.length > 100) {
      // Split large batches
      const chunks = this.chunkArray(ids, 50);
      const results = await Promise.all(
        chunks.map(chunk => super.batchLoadByIds(chunk, opts, ctx))
      );
      return results.flat();
    }

    return super.batchLoadByIds(ids, opts, ctx);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

---

## 🎯 Best Practices

### 1. Repository Implementation

```typescript
// ✅ Good: Implement findByIds efficiently
@Injectable()
export class UserRepository extends TypeOrmBaseRepository<User> implements GraphQLBaseRepository<User> {
  async findByIds(ids: string[], opts?: BaseRepositoryFindByIdOpts<User>): Promise<User[]> {
    return this.createQueryBuilder('user')
      .whereInIds(ids)
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.id', 'ASC') // Important for order preservation
      .getMany();
  }
}
```

### 2. DataLoader Usage

```typescript
// ✅ Good: Use DataLoader for N+1 prevention
@Resolver(() => Post)
export class PostResolver {
  constructor(
    private readonly postService: PostGraphQLService,
    private readonly userDataLoader: UserDataLoader,
  ) {}

  @ResolveField(() => User)
  async author(@Parent() post: Post): Promise<User | null> {
    return this.userDataLoader.load(post.authorId);
  }
}
```

### 3. Field Selection

```typescript
// ✅ Good: Use field selection for performance
@Query(() => UserConnection)
async users(@Info() info: GraphQLResolveInfo): Promise<GraphQLConnection<User>> {
  return this.userService.listWithGraphQLFieldsAndRelations(
    { first: 10 },
    { fieldNodes: info.fieldNodes }
  );
}
```

### 4. Caching Strategy

```typescript
// ✅ Good: Configure appropriate cache settings
{
  cache: {
    enabled: true,
    ttlSec: 300,        // 5 minutes for frequently accessed data
    swrSec: 60,         // 1 minute SWR window
    prefix: 'users'     // Clear cache key prefix
  }
}
```

### 5. Security

```typescript
// ✅ Good: Implement relations whitelist
{
  relationsWhitelist: {
    profile: true,
    roles: true,
    // Exclude sensitive relations
  },
  selectWhitelist: {
    id: true,
    name: true,
    email: true,
    // Exclude sensitive fields
  }
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. DataLoader Order Issues

**Problem**: DataLoader returns entities in wrong order
**Solution**: Ensure repository preserves order

```typescript
// ✅ Good: Preserve order in repository
async findByIds(ids: string[]): Promise<User[]> {
  return this.createQueryBuilder('user')
    .whereInIds(ids)
    .orderBy('user.id', 'ASC') // Important!
    .getMany();
}
```

#### 2. Field Selection Not Working

**Problem**: All fields are loaded despite GraphQL selection
**Solution**: Check field extraction logic

```typescript
// Debug field extraction
private extractFieldsFromGraphQLInfo(graphQLInfo: any): FindOptionsSelect<User> | undefined {
  console.log('GraphQL Info:', JSON.stringify(graphQLInfo, null, 2));
  return super.extractFieldsFromGraphQLInfo(graphQLInfo);
}
```

#### 3. Relations Not Loading

**Problem**: Relations not loaded despite being in GraphQL query
**Solution**: Check relations whitelist and field extraction

```typescript
// Debug relations
const allowedRelations = this.getAllowedRelations();
console.log('Allowed relations:', allowedRelations);

const graphQLRelations = this.extractRelationsFromGraphQLInfo(graphQLInfo);
console.log('GraphQL relations:', graphQLRelations);
```

### Performance Issues

#### 1. N+1 Queries

**Problem**: Multiple queries for related data
**Solution**: Use DataLoader

```typescript
// ❌ Bad: N+1 queries
@ResolveField(() => User)
async author(@Parent() post: Post) {
  return this.userService.findById(post.authorId);
}

// ✅ Good: Use DataLoader
@ResolveField(() => User)
async author(@Parent() post: Post) {
  return this.userDataLoader.load(post.authorId);
}
```

#### 2. Over-fetching Data

**Problem**: Loading too much data
**Solution**: Use field selection

```typescript
// ❌ Bad: Load all fields
const user = await this.userService.findById(id);

// ✅ Good: Use field selection
const user = await this.userService.findWithGraphQLFields(
  { id },
  { fieldNodes: info.fieldNodes }
);
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('UserGraphQLService', () => {
  let service: UserGraphQLService;
  let mockRepo: jest.Mocked<GraphQLBaseRepository<User>>;

  beforeEach(() => {
    mockRepo = {
      findByIds: jest.fn(),
      // ... other methods
    } as any;

    service = new UserGraphQLService(mockRepo, cacheService);
  });

  it('should load users by IDs with preserved order', async () => {
    const users = [user1, user2, user3];
    mockRepo.findByIds.mockResolvedValue(users);

    const result = await service.findByIds(['1', '2', '3']);

    expect(result).toEqual(users);
    expect(mockRepo.findByIds).toHaveBeenCalledWith(['1', '2', '3'], expect.any(Object));
  });

  it('should handle missing users in batch load', async () => {
    const users = [user1, user3]; // user2 missing
    mockRepo.findByIds.mockResolvedValue(users);

    const result = await service.findByIds(['1', '2', '3']);

    expect(result).toEqual([user1, null, user3]);
  });
});
```

### Integration Tests

```typescript
describe('UserGraphQLService Integration', () => {
  it('should paginate users with GraphQL connection format', async () => {
    const result = await service.listGraphQL({
      first: 10,
      after: undefined
    });

    expect(result).toHaveProperty('edges');
    expect(result).toHaveProperty('pageInfo');
    expect(result.edges).toHaveLength(10);
    expect(result.pageInfo.hasNextPage).toBeDefined();
  });
});
```

---

## 📚 Additional Resources

- [Base Service Guide](./BASE_SERVICE_GUIDE.md)
- [Relations Whitelist Examples](./RELATIONS_WHITELIST_EXAMPLES.md)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [DataLoader Documentation](https://github.com/graphql/dataloader)

---

**GraphQLBaseService** provides powerful GraphQL-specific optimizations while maintaining all the benefits of BaseService. Use it to build high-performance GraphQL APIs with automatic field selection, relation filtering, and DataLoader support.
