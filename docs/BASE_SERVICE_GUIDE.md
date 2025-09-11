# 📚 BaseService Complete Guide

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
10. [Migration Guide](#migration-guide)

---

## 🎯 Overview

`BaseService` is a powerful, generic abstract service class that provides a comprehensive foundation for building data services in NestJS applications. It implements the Repository pattern and offers a wide range of features including CRUD operations, pagination, caching, event emission, and more.

### Key Benefits

- ✅ **Generic & Type-Safe**: Full TypeScript support with generic types
- ✅ **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- ✅ **Pagination**: Both offset-based and cursor-based pagination
- ✅ **Caching**: Redis-based caching with Stale-While-Revalidate (SWR) pattern
- ✅ **Event System**: Domain event emission for decoupled architecture
- ✅ **Transaction Support**: Database transaction management
- ✅ **Soft Delete**: Built-in soft delete functionality
- ✅ **Batch Operations**: Efficient batch processing
- ✅ **Security**: Field whitelisting and input validation
- ✅ **Extensibility**: Lifecycle hooks for customization

---

## 🏗️ Architecture

### Class Hierarchy

```typescript
@Injectable()
export abstract class BaseService<T extends { id: string }> {
  // Core properties and methods
}
```

### Dependencies

- **BaseRepository<T>**: Data access layer
- **CacheService**: Redis caching (optional)
- **EventEmitter**: Domain events (optional)

### Key Components

1. **Repository Layer**: Abstracted data access
2. **Cache Layer**: Redis-based caching with SWR
3. **Event Layer**: Domain event emission
4. **Validation Layer**: Input validation and field whitelisting
5. **Pagination Layer**: Multiple pagination strategies

---

## 🚀 Core Features

### 1. CRUD Operations

#### Create Operations
- `create(data, ctx?)`: Create single entity
- `createMany(data[], ctx?)`: Create multiple entities
- Lifecycle hooks: `beforeCreate()`, `afterCreate()`

#### Read Operations
- `findById(id, opts?, ctx?)`: Find by ID with caching
- `findOne(where, opts?, ctx?)`: Find single entity
- `listOffset(pagination, extraFilter?, opts?, ctx?)`: Offset pagination
- `listCursor(pagination, extraFilter?, opts?, ctx?)`: Cursor pagination

#### Update Operations
- `update(id, patch, ctx?)`: Update single entity
- `updateMany(updates[], ctx?)`: Update multiple entities
- Lifecycle hooks: `beforeUpdate()`, `afterUpdate()`

#### Delete Operations
- `remove(id, ctx?)`: Hard delete
- `removeMany(ids[], ctx?)`: Batch hard delete
- `softDelete(id, ctx?)`: Soft delete
- `softDeleteMany(ids[], ctx?)`: Batch soft delete
- `restore(id, ctx?)`: Restore soft-deleted entity
- Lifecycle hooks: `beforeDelete()`, `afterDelete()`

### 2. Pagination

#### Offset Pagination
```typescript
const result = await service.listOffset({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  order: 'DESC',
  query: 'search term',
  fields: ['name', 'email']
});
```

#### Cursor Pagination
```typescript
const result = await service.listCursor({
  limit: 10,
  cursor: 'encoded_cursor',
  sortBy: 'createdAt',
  order: 'DESC'
});
```

### 3. Caching

#### Cache Configuration
```typescript
{
  cache: {
    enabled: true,
    ttlSec: 3600,      // Cache TTL
    swrSec: 300,       // Stale-While-Revalidate window
    prefix: 'users'    // Cache key prefix
  }
}
```

#### Cache Features
- **Automatic Caching**: `findById()` results are cached
- **Cache Invalidation**: Automatic invalidation on updates/deletes
- **SWR Pattern**: Background refresh for better performance
- **Pattern-based Invalidation**: Bulk cache clearing

### 4. Event System

#### Event Emission
```typescript
// Automatic events
this.emitEvent(`${this.entityName}.created`, { after: entity });
this.emitEvent(`${this.entityName}.updated`, { after: entity });
this.emitEvent(`${this.entityName}.deleted`, { before: { id } });
```

#### Event Configuration
```typescript
{
  emitEvents: true  // Enable/disable event emission
}
```

### 5. Security Features

#### Field Whitelisting
```typescript
// Searchable fields whitelist
protected getSearchableColumns(): (keyof T)[] {
  return ['name', 'email', 'username'];
}

// Select fields whitelist
{
  selectWhitelist: {
    id: true,
    name: true,
    email: true
  }
}
```

#### Input Validation
- Automatic validation for `create()` and `findById()`
- Field validation for search operations
- Type safety with TypeScript generics

---

## 🚀 Getting Started

### 1. Basic Setup

```typescript
import { BaseService } from 'src/common/services/base.service';
import { BaseRepository } from 'src/common/repositories/base.repository';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(
      repo,
      {
        entityName: 'User',
        cache: { enabled: true, ttlSec: 60, prefix: 'users' },
        emitEvents: true,
        defaultSearchField: 'name',
      },
      cacheService,
    );
  }
}
```

### 2. Repository Setup

```typescript
@Injectable()
export class UserRepository extends TypeOrmBaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super(userRepo);
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
    UserService,
  ],
  exports: [UserService],
})
export class UserModule {}
```

---

## 📖 API Reference

### Constructor Options

```typescript
interface BaseServiceOptions {
  entityName: string;                    // Entity name for events/logging
  idKey?: string;                       // Primary key field (default: 'id')
  softDelete?: boolean;                 // Enable soft delete (auto-detected)
  relationsWhitelist?: string[];        // Allowed relations
  selectWhitelist?: FindOptionsSelect<T>; // Allowed select fields
  cache?: CacheOptions & { prefix?: string }; // Cache configuration
  emitEvents?: boolean;                 // Enable event emission
  defaultSearchField?: string;          // Default search field
}
```

### Lifecycle Hooks

```typescript
// Override these methods in your service
protected async beforeCreate(data: DeepPartial<T>): Promise<DeepPartial<T>>
protected async afterCreate(entity: T): Promise<void>
protected async beforeUpdate(id: string, patch: DeepPartial<T>): Promise<void>
protected async afterUpdate(entity: T): Promise<void>
protected async beforeDelete(id: string): Promise<void>
protected async afterDelete(id: string): Promise<void>
protected async onListQueryBuilt(ctx: { where: unknown; order: unknown; dto: any }): Promise<void>
```

### Query Options

```typescript
interface QOpts<T> {
  relations?: string[] | FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  withDeleted?: boolean;
}
```

### Pagination DTOs

```typescript
// Offset Pagination
interface AdvancedPaginationDto {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  query?: string;
  fields?: string | string[];
  // ... other filters
}

// Cursor Pagination
interface CursorPaginationDto {
  limit: number;
  cursor?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  // ... other filters
}
```

---

## 💡 Usage Examples

### 1. Basic CRUD Operations

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  // Create user
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.create(userData);
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    return this.findById(id);
  }

  // Update user
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    return this.update(id, updateData);
  }

  // Delete user
  async deleteUser(id: string): Promise<void> {
    return this.remove(id);
  }
}
```

### 2. Pagination Examples

```typescript
// Offset pagination with search
async searchUsers(searchTerm: string, page: number = 1) {
  return this.listOffset({
    page,
    limit: 10,
    query: searchTerm,
    fields: ['name', 'email'],
    sortBy: 'createdAt',
    order: 'DESC'
  });
}

// Cursor pagination for real-time feeds
async getUsersFeed(cursor?: string) {
  return this.listCursor({
    limit: 20,
    cursor,
    sortBy: 'createdAt',
    order: 'DESC'
  });
}
```

### 3. Custom Search Implementation

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  // Override searchable columns
  protected getSearchableColumns(): (keyof User)[] {
    return ['name', 'email', 'username'];
  }

  // Custom search with additional filters
  async searchUsersWithFilters(filters: UserSearchFilters) {
    return this.listOffset(
      {
        page: filters.page,
        limit: filters.limit,
        query: filters.query,
        fields: filters.fields,
        status: filters.status,
        role: filters.role
      },
      { isActive: true } // Additional filter
    );
  }
}
```

### 4. Batch Operations

```typescript
// Create multiple users
async createUsers(userDataList: CreateUserDto[]) {
  return this.createMany(userDataList);
}

// Update multiple users
async updateUsers(updates: Array<{ id: string; patch: UpdateUserDto }>) {
  return this.updateMany(updates);
}

// Delete multiple users
async deleteUsers(userIds: string[]) {
  return this.removeMany(userIds);
}
```

### 5. Transaction Support

```typescript
// Run operations in transaction
async createUserWithProfile(userData: CreateUserDto, profileData: CreateProfileDto) {
  return this.runInTransaction(async (queryRunner) => {
    const user = await this.create(userData, { queryRunner });
    const profile = await this.profileService.create(profileData, { queryRunner });
    return { user, profile };
  });
}
```

### 6. Custom Lifecycle Hooks

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  // Custom validation before creation
  protected async beforeCreate(data: DeepPartial<User>): Promise<DeepPartial<User>> {
    // Hash password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    // Set default values
    data.status = data.status || 'ACTIVE';
    data.role = data.role || 'USER';
    
    return data;
  }

  // Custom logic after creation
  protected async afterCreate(entity: User): Promise<void> {
    // Send welcome email
    await this.emailService.sendWelcomeEmail(entity.email);
    
    // Create user profile
    await this.profileService.create({ userId: entity.id });
  }

  // Custom validation before update
  protected async beforeUpdate(id: string, patch: DeepPartial<User>): Promise<void> {
    // Prevent updating certain fields
    if (patch.id || patch.createdAt) {
      throw new BadRequestException('Cannot update ID or creation date');
    }
  }
}
```

---

## 🔧 Advanced Features

### 1. Custom Query Building

```typescript
// Override query building hook
protected async onListQueryBuilt(ctx: {
  where: unknown;
  order: unknown;
  dto: AdvancedPaginationDto | CursorPaginationDto;
}): Promise<void> {
  // Add custom where conditions
  if (this.currentUser?.role !== 'ADMIN') {
    (ctx.where as any).isPublic = true;
  }
}
```

### 2. Cache Customization

```typescript
// Custom cache key generation
protected buildCacheKey(operation: string, data: Record<string, unknown>): string | undefined {
  if (!this.cache) return undefined;
  
  // Add user-specific cache key
  const userId = this.currentUser?.id;
  const baseKey = super.buildCacheKey(operation, data);
  
  return userId ? `${baseKey}:user:${userId}` : baseKey;
}
```

### 3. Event Customization

```typescript
// Custom event emission
protected emitEvent(event: string, payload: unknown): void {
  if (!this.opts.emitEvents) return;
  
  // Add metadata to events
  const enrichedPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    service: this.constructor.name,
    version: '1.0.0'
  };
  
  this.eventEmitter?.emit?.(event, enrichedPayload);
}
```

### 4. Field Validation

```typescript
// Custom field validation
protected validateAndPrepareSearchFields(userFields?: string | string[]): string[] {
  const searchableColumns = this.getSearchableColumns();
  const allowedFields = searchableColumns.map((col) => String(col));

  if (!userFields) {
    return allowedFields;
  }

  const userFieldsArray = Array.isArray(userFields) ? userFields : [userFields];
  
  // Custom validation logic
  const invalidFields = userFieldsArray.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    throw new BadRequestException(
      `Invalid search fields: ${invalidFields.join(', ')}. ` +
      `Allowed fields: ${allowedFields.join(', ')}`
    );
  }

  return userFieldsArray;
}
```

---

## 🎯 Best Practices

### 1. Service Design

```typescript
// ✅ Good: Clear service structure
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      cache: { enabled: true, ttlSec: 300, prefix: 'users' },
      emitEvents: true,
      defaultSearchField: 'name',
    }, cacheService);
  }

  // Override only what you need
  protected getSearchableColumns(): (keyof User)[] {
    return ['name', 'email', 'username'];
  }
}
```

### 2. Error Handling

```typescript
// ✅ Good: Use lifecycle hooks for validation
protected async beforeCreate(data: DeepPartial<User>): Promise<DeepPartial<User>> {
  if (!data.email) {
    throw new BadRequestException('Email is required');
  }
  
  // Check for duplicate email
  const existingUser = await this.findOne({ email: data.email });
  if (existingUser) {
    throw new ConflictException('Email already exists');
  }
  
  return data;
}
```

### 3. Performance Optimization

```typescript
// ✅ Good: Use appropriate pagination
// For real-time feeds
async getRecentUsers(cursor?: string) {
  return this.listCursor({
    limit: 20,
    cursor,
    sortBy: 'createdAt',
    order: 'DESC'
  });
}

// For admin panels
async getUsersList(page: number, filters: UserFilters) {
  return this.listOffset({
    page,
    limit: 50,
    ...filters
  });
}
```

### 4. Caching Strategy

```typescript
// ✅ Good: Configure cache appropriately
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
// ✅ Good: Implement field whitelisting
{
  selectWhitelist: {
    id: true,
    name: true,
    email: true,
    // Exclude sensitive fields like password
  },
  relationsWhitelist: ['profile', 'roles']
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Cache Not Working

**Problem**: Cached data not being returned
**Solution**: Check cache configuration and Redis connection

```typescript
// Debug cache
console.log('Cache enabled:', this.cache?.enabled);
console.log('Cache service:', !!this.cacheService);
```

#### 2. Pagination Issues

**Problem**: Incorrect pagination results
**Solution**: Verify pagination parameters and sorting

```typescript
// Debug pagination
console.log('Pagination DTO:', pagination);
console.log('Where clause:', where);
console.log('Order clause:', order);
```

#### 3. Event Not Emitting

**Problem**: Events not being emitted
**Solution**: Check event emitter configuration

```typescript
// Debug events
console.log('Events enabled:', this.opts.emitEvents);
console.log('Event emitter:', !!this.eventEmitter);
```

#### 4. Field Validation Errors

**Problem**: Invalid field errors
**Solution**: Check field whitelist configuration

```typescript
// Debug fields
console.log('Searchable columns:', this.getSearchableColumns());
console.log('Select whitelist:', this.opts.selectWhitelist);
```

### Debug Mode

```typescript
// Enable debug logging
protected async onListQueryBuilt(ctx: any): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('Query context:', JSON.stringify(ctx, null, 2));
  }
}
```

---

## 🔄 Migration Guide

### From Custom Service to BaseService

#### Before (Custom Service)

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cacheService: CacheService,
  ) {}

  async findById(id: string): Promise<User> {
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;
    
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    
    await this.cacheService.set(`user:${id}`, user, 300);
    return user;
  }
}
```

#### After (BaseService)

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      cache: { enabled: true, ttlSec: 300, prefix: 'users' },
    }, cacheService);
  }

  // findById is now inherited with caching!
}
```

### Gradual Migration Steps

1. **Create BaseRepository wrapper**
2. **Extend BaseService**
3. **Configure options**
4. **Test functionality**
5. **Remove custom implementations**

---

## 📚 Additional Resources

- [Repository Pattern Guide](./REPOSITORY_PATTERN.md)
- [Caching Best Practices](./CACHING_GUIDE.md)
- [Event System Documentation](./EVENT_SYSTEM.md)
- [Pagination Strategies](./PAGINATION_GUIDE.md)

---

## 🤝 Contributing

When extending BaseService:

1. Follow the existing patterns
2. Add comprehensive tests
3. Update documentation
4. Consider backward compatibility

---

**BaseService** provides a solid foundation for building scalable, maintainable data services in NestJS applications. By following the patterns and best practices outlined in this guide, you can create robust services that handle common data operations efficiently and securely.
