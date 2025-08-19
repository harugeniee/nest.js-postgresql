# BaseService for NestJS + TypeORM + Redis

This BaseService centralizes CRUD, pagination (offset and cursor), caching, transactions, and error mapping while reusing existing project utilities:

- DTOs: `AdvancedPaginationDto`, `CursorPaginationDto`
- Filtering: `ConditionBuilder.build(...)` (source of truth)
- Pagination envelope: `PaginationFormatter.offset(...)` returning `IPagination<T>`

It integrates Redis cache through the existing `CacheService` and emits optional typed events if an event emitter exists (feature-flag placeholder).

## Table of Contents

- [Key Features](#key-features)
- [Basic Usage](#basic-usage)
- [Constructor Options](#constructor-options)
- [Core Methods](#core-methods)
- [Override Methods](#override-methods)
- [Customization Examples](#customization-examples)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)

## Key Features

- Uses `ConditionBuilder.build` exactly to construct where filters
- Offset listing returns `IPagination<T>` using `PaginationFormatter.offset`
- Cursor listing respects filters and adds opaque cursors
- Redis cache for id and list keys with automatic invalidation on mutations
- Error mapping for common Postgres codes (23505/23503) and NotFound
- Transaction helper using TypeORM `QueryRunner`
- Optional whitelists for relations and select fields
- Lifecycle hooks for before/after operations
- Event emission system for domain events

## Basic Usage

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
      selectWhitelist: ['id', 'email', 'name', 'createdAt'],
      cache: { enabled: true, ttlSec: 60, prefix: 'users', swrSec: 30 },
      defaultSearchField: 'name',
      emitEvents: true,
    }, cacheService);
  }

  protected override getSearchableColumns() {
    return ['email', 'name'] as (keyof User)[];
  }
}
```

## Constructor Options

```ts
interface BaseServiceOptions {
  entityName: string;                    // Required: Name for error messages and events
  idKey?: string;                        // Optional: Primary key field (default: 'id')
  softDelete?: boolean;                  // Optional: Enable soft delete (auto-detected)
  relationsWhitelist?: string[];         // Optional: Allowed relation fields
  selectWhitelist?: (keyof T)[];        // Optional: Allowed select fields
  cache?: CacheOptions & { prefix?: string }; // Optional: Cache configuration
  emitEvents?: boolean;                  // Optional: Enable event emission
  defaultSearchField?: string;           // Optional: Default search field (default: 'name')
}
```

### Cache Options

```ts
interface CacheOptions {
  enabled: boolean;                      // Enable/disable caching
  ttlSec: number;                        // Time to live in seconds
  prefix?: string;                       // Cache key prefix (defaults to entityName)
  swrSec?: number;                       // Stale-while-revalidate window in seconds
}
```

## Core Methods

### CRUD Operations

#### Create Entity
```ts
// Basic creation
const user = await this.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// With transaction context
const user = await this.create(userData, { queryRunner: qr });
```

#### Find by ID
```ts
// Basic find by ID
const user = await this.findById('user-123');

// With relations and select
const user = await this.findById('user-123', {
  relations: ['profile', 'sessions'],
  select: ['id', 'email', 'name']
});

// With transaction context
const user = await this.findById('user-123', undefined, { queryRunner: qr });
```

#### Find One
```ts
// Find by conditions
const user = await this.findOne({ email: 'user@example.com' });

// With options
const user = await this.findOne(
  { email: 'user@example.com' },
  { relations: ['profile'], select: ['id', 'email'] }
);
```

#### Update Entity
```ts
// Basic update
const updatedUser = await this.update('user-123', {
  name: 'Jane Doe'
});

// With transaction context
const updatedUser = await this.update('user-123', patchData, { queryRunner: qr });
```

#### Delete Entity
```ts
// Hard delete
await this.remove('user-123');

// Soft delete (if enabled)
await this.softDelete('user-123');

// Restore soft deleted entity
await this.restore('user-123');

// With transaction context
await this.remove('user-123', { queryRunner: qr });
```

### Pagination Methods

#### Offset Pagination
```ts
// Basic offset pagination
const paginationDto = new AdvancedPaginationDto();
paginationDto.page = 1;
paginationDto.limit = 10;
paginationDto.sortBy = 'createdAt';
paginationDto.order = 'DESC';
paginationDto.query = 'john'; // Search query

const result = await this.listOffset(paginationDto);
// Returns: IPagination<T> with data, total, page, limit, totalPages

// With extra filters
const result = await this.listOffset(paginationDto, {
  status: 'active',
  role: 'user'
});

// With query options
const result = await this.listOffset(paginationDto, undefined, {
  relations: ['profile'],
  select: ['id', 'email', 'name']
});
```

#### Cursor Pagination
```ts
// Basic cursor pagination
const cursorDto = new CursorPaginationDto();
cursorDto.limit = 10;
cursorDto.sortBy = 'createdAt';
cursorDto.order = 'DESC';
cursorDto.cursor = 'encoded-cursor-string'; // Optional

const result = await this.listCursor(cursorDto);
// Returns: IPaginationCursor<T> with result array and metaData

// With extra filters
const result = await this.listCursor(cursorDto, {
  status: 'active'
});

// With query options
const result = await this.listCursor(cursorDto, undefined, {
  relations: ['profile'],
  select: ['id', 'email', 'name']
});
```

### Transaction Support
```ts
// Run operations in transaction
await this.runInTransaction(async (queryRunner) => {
  const user = await this.create(userData, { queryRunner });
  await this.update(user.id, { status: 'verified' }, { queryRunner });
  
  // All operations in this block use the same transaction
  return user;
});
```

#### Transaction Examples in Service

```ts
@Injectable()
export class UserService extends BaseService<User> {
  // Example 1: Create user with profile in transaction
  async createUserWithProfile(userData: any, profileData: any): Promise<User> {
    return this.runInTransaction(async (queryRunner) => {
      // Create user first
      const user = await this.create(userData, { queryRunner });
      
      // Create profile with user reference
      const profile = await this.profileService.create({
        ...profileData,
        userId: user.id
      }, { queryRunner });
      
      // Update user with profile reference
      await this.update(user.id, { 
        profileId: profile.id,
        status: 'active'
      }, { queryRunner });
      
      // Log the creation
      await this.auditService.log('user.created', {
        userId: user.id,
        profileId: profile.id
      }, { queryRunner });
      
      return user;
    });
  }

  // Example 2: Bulk operations with transaction
  async bulkUpdateUserStatus(userIds: string[], newStatus: string): Promise<void> {
    await this.runInTransaction(async (queryRunner) => {
      for (const userId of userIds) {
        // Update user status
        await this.update(userId, { status: newStatus }, { queryRunner });
        
        // Update related records
        await this.userSessionsService.updateByUserId(
          userId, 
          { isActive: newStatus === 'active' }, 
          { queryRunner }
        );
        
        // Log the change
        await this.auditService.log('user.status.updated', {
          userId,
          oldStatus: 'unknown', // You might want to fetch this first
          newStatus
        }, { queryRunner });
      }
    });
  }

  // Example 3: Complex business logic with rollback scenarios
  async transferUserToNewTenant(userId: string, newTenantId: string): Promise<void> {
    await this.runInTransaction(async (queryRunner) => {
      // Check if user exists and get current data
      const user = await this.findById(userId, undefined, { queryRunner });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Validate new tenant
      const newTenant = await this.tenantService.findById(newTenantId, undefined, { queryRunner });
      if (!newTenant) {
        throw new NotFoundException('New tenant not found');
      }
      
      // Check if user has active sessions
      const activeSessions = await this.userSessionsService.findByUserId(
        userId, 
        undefined, 
        { queryRunner }
      );
      
      if (activeSessions.length > 0) {
        // Force logout all active sessions
        await this.userSessionsService.bulkUpdate(
          activeSessions.map(s => s.id),
          { isActive: false, loggedOutAt: new Date() },
          { queryRunner }
        );
      }
      
      // Update user tenant
      await this.update(userId, { 
        tenantId: newTenantId,
        updatedAt: new Date()
      }, { queryRunner });
      
      // Update user permissions for new tenant
      await this.userPermissionsService.updateForTenant(
        userId, 
        newTenantId, 
        { queryRunner }
      );
      
      // Log the transfer
      await this.auditService.log('user.tenant.transferred', {
        userId,
        oldTenantId: user.tenantId,
        newTenantId,
        transferredAt: new Date()
      }, { queryRunner });
    });
  }

  // Example 4: Nested transaction with error handling
  async processUserRegistration(registrationData: any): Promise<User> {
    try {
      return await this.runInTransaction(async (queryRunner) => {
        // Create user account
        const user = await this.create(registrationData.user, { queryRunner });
        
        // Send verification email
        await this.emailService.sendVerificationEmail(
          user.email, 
          user.id, 
          { queryRunner }
        );
        
        // Create default user settings
        await this.userSettingsService.createDefaultSettings(
          user.id, 
          { queryRunner }
        );
        
        // Add to default user group
        await this.userGroupService.addUserToGroup(
          user.id, 
          'default', 
          { queryRunner }
        );
        
        // Initialize user storage quota
        await this.storageService.initializeUserQuota(
          user.id, 
          { queryRunner }
        );
        
        return user;
      });
    } catch (error) {
      // Log the error for debugging
      this.logger.error('User registration failed', error);
      
      // Re-throw the error (transaction will automatically rollback)
      throw error;
    }
  }
}
```

## Override Methods

### Lifecycle Hooks

#### Before/After Create
```ts
protected async beforeCreate(data: DeepPartial<User>): Promise<DeepPartial<User>> {
  // Validate or modify data before creation
  if (data.email) {
    data.email = data.email.toLowerCase();
  }
  
  // Add default values
  data.status = data.status || 'pending';
  
  return data;
}

protected async afterCreate(entity: User): Promise<void> {
  // Send welcome email
  await this.emailService.sendWelcome(entity.email);
  
  // Log creation
  this.logger.log(`User created: ${entity.id}`);
}
```

#### Before/After Update
```ts
protected async beforeUpdate(id: string, patch: DeepPartial<User>): Promise<void> {
  // Validate update permissions
  const currentUser = await this.findById(id);
  if (currentUser.status === 'locked') {
    throw new ForbiddenException('Cannot update locked user');
  }
  
  // Log changes
  this.logger.log(`Updating user ${id}:`, patch);
}

protected async afterUpdate(entity: User): Promise<void> {
  // Notify other services
  await this.eventBus.emit('user.updated', entity);
  
  // Update search index
  await this.searchService.indexUser(entity);
}
```

#### Before/After Delete
```ts
protected async beforeDelete(id: string): Promise<void> {
  // Check dependencies
  const dependencies = await this.checkUserDependencies(id);
  if (dependencies.length > 0) {
    throw new BadRequestException('Cannot delete user with dependencies');
  }
  
  // Archive user data
  await this.archiveUserData(id);
}

protected async afterDelete(id: string): Promise<void> {
  // Clean up related data
  await this.cleanupUserData(id);
  
  // Notify admin
  await this.notifyAdmin(`User ${id} was deleted`);
}
```

### Query Customization

#### Custom Search Columns
```ts
protected getSearchableColumns(): (keyof User)[] {
  return ['email', 'name', 'username', 'phone'] as (keyof User)[];
}
```

#### Custom Query Building
```ts
protected async onListQueryBuilt(ctx: {
  where: unknown;
  order: unknown;
  dto: AdvancedPaginationDto | CursorPaginationDto;
}): Promise<void> {
  // Add custom filters
  if (this.currentUser.role !== 'admin') {
    ctx.where = { ...ctx.where, tenantId: this.currentUser.tenantId };
  }
  
  // Add default sorting for specific cases
  if (!ctx.dto.sortBy) {
    ctx.dto.sortBy = 'lastLoginAt';
    ctx.dto.order = 'DESC';
  }
}
```

## Customization Examples

### Custom Service with Advanced Features
```ts
@Injectable()
export class AdvancedUsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    cacheService: CacheService,
    private readonly emailService: EmailService,
    private readonly searchService: SearchService,
    private readonly eventBus: EventBus,
  ) {
    super(new TypeOrmBaseRepository(userRepo), {
      entityName: 'User',
      relationsWhitelist: ['profile', 'sessions', 'roles'],
      selectWhitelist: ['id', 'email', 'name', 'status', 'createdAt', 'lastLoginAt'],
      cache: { 
        enabled: true, 
        ttlSec: 300, 
        prefix: 'users', 
        swrSec: 60 
      },
      defaultSearchField: 'name',
      emitEvents: true,
    }, cacheService);
  }

  // Custom business logic methods
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  async findActiveUsers(): Promise<User[]> {
    const pagination = new AdvancedPaginationDto();
    pagination.page = 1;
    pagination.limit = 1000;
    
    const result = await this.listOffset(pagination, { status: 'active' });
    return result.data;
  }

  async bulkUpdateStatus(userIds: string[], status: string): Promise<void> {
    await this.runInTransaction(async (queryRunner) => {
      for (const userId of userIds) {
        await this.update(userId, { status }, { queryRunner });
      }
    });
  }

  // Override lifecycle hooks
  protected async beforeCreate(data: DeepPartial<User>): Promise<DeepPartial<User>> {
    // Normalize email
    if (data.email) {
      data.email = data.email.toLowerCase().trim();
    }
    
    // Set default values
    data.status = data.status || 'pending';
    data.createdAt = new Date();
    
    return data;
  }

  protected async afterCreate(entity: User): Promise<void> {
    // Send welcome email
    await this.emailService.sendWelcome(entity.email);
    
    // Index in search
    await this.searchService.indexUser(entity);
    
    // Emit custom event
    this.eventBus.emit('user.created', entity);
  }

  protected async beforeUpdate(id: string, patch: DeepPartial<User>): Promise<void> {
    // Validate email uniqueness if changing
    if (patch.email) {
      const existing = await this.findByEmail(patch.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  protected async afterUpdate(entity: User): Promise<void> {
    // Update search index
    await this.searchService.indexUser(entity);
    
    // Emit custom event
    this.eventBus.emit('user.updated', entity);
  }

  protected getSearchableColumns(): (keyof User)[] {
    return ['email', 'name', 'username', 'phone', 'company'] as (keyof User)[];
  }

  protected async onListQueryBuilt(ctx: {
    where: unknown;
    order: unknown;
    dto: AdvancedPaginationDto | CursorPaginationDto;
  }): Promise<void> {
    // Add tenant isolation
    if (this.currentUser?.tenantId) {
      ctx.where = { ...ctx.where, tenantId: this.currentUser.tenantId };
    }
    
    // Add default sorting for users
    if (!ctx.dto.sortBy) {
      ctx.dto.sortBy = 'lastLoginAt';
      ctx.dto.order = 'DESC';
    }
  }
}
```

### Service with Custom Query Options
```ts
@Injectable()
export class CustomUsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    cacheService: CacheService,
  ) {
    super(new TypeOrmBaseRepository(userRepo), {
      entityName: 'User',
      relationsWhitelist: ['profile'],
      selectWhitelist: ['id', 'email', 'name'],
      cache: { enabled: true, ttlSec: 60, prefix: 'users' },
      defaultSearchField: 'name',
    }, cacheService);
  }

  // Custom method with specific query options
  async findUsersWithProfile(): Promise<User[]> {
    const pagination = new AdvancedPaginationDto();
    pagination.page = 1;
    pagination.limit = 100;
    
    const result = await this.listOffset(pagination, undefined, {
      relations: ['profile'],
      select: ['id', 'email', 'name', 'profile']
    });
    
    return result.data;
  }

  // Custom method with cursor pagination
  async findRecentUsers(limit: number = 20): Promise<IPaginationCursor<User>> {
    const cursorDto = new CursorPaginationDto();
    cursorDto.limit = limit;
    cursorDto.sortBy = 'lastLoginAt';
    cursorDto.order = 'DESC';
    
    return this.listCursor(cursorDto, { status: 'active' });
  }
}
```

## Advanced Usage

### Custom Repository Integration
```ts
@Injectable()
export class CustomUserRepository extends TypeOrmBaseRepository<User> {
  async findByCustomCriteria(criteria: any): Promise<User[]> {
    return this.repository.createQueryBuilder('user')
      .where('user.status = :status', { status: criteria.status })
      .andWhere('user.createdAt >= :date', { date: criteria.startDate })
      .getMany();
  }
}

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    private readonly customRepo: CustomUserRepository,
    cacheService: CacheService,
  ) {
    super(customRepo, {
      entityName: 'User',
      cache: { enabled: true, ttlSec: 60, prefix: 'users' },
    }, cacheService);
  }

  // Use custom repository method
  async findActiveUsersSince(date: Date): Promise<User[]> {
    return this.customRepo.findByCustomCriteria({
      status: 'active',
      startDate: date
    });
  }
}
```

### Event Handling
```ts
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(new TypeOrmBaseRepository(userRepo), {
      entityName: 'User',
      emitEvents: true,
    }, cacheService, eventEmitter);
  }

  // Custom event handling
  protected emitEvent(event: string, payload: unknown): void {
    // Add custom event logic
    this.eventEmitter.emit(event, payload);
    
    // Log events
    this.logger.log(`Event emitted: ${event}`, payload);
  }
}
```

## Error Handling

The BaseService automatically handles common errors:

- **Not Found (404)**: When entity is not found
- **Conflict (409)**: For duplicate key violations (Postgres 23505)
- **Bad Request (400)**: For foreign key violations (Postgres 23503)
- **Internal Server Error (500)**: For other database errors

### Custom Error Handling
```ts
@Injectable()
export class UserService extends BaseService<User> {
  // Override error handling if needed
  async create(data: DeepPartial<User>): Promise<User> {
    try {
      return await super.create(data);
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
}
```

## Cache Management

### Cache Keys
- **Entity by ID**: `${prefix}:id:${id}`
- **List queries**: `${prefix}:list:${hash}`

### Cache Invalidation
Cache is automatically invalidated on:
- Create operations
- Update operations  
- Delete operations (hard and soft)
- Restore operations

### Manual Cache Control
```ts
// Invalidate specific entity cache
await this.invalidateCacheForEntity('user-123');

// Clear all cache for this entity type
await this.cacheService?.deleteKeysByPattern(`${this.cache.prefix}:*`);
```

## Best Practices

1. **Always override `getSearchableColumns()`** to define searchable fields
2. **Use lifecycle hooks** for business logic instead of overriding main methods
3. **Leverage the cache system** for frequently accessed data
4. **Use transactions** for operations that modify multiple entities
5. **Implement proper validation** in `beforeCreate` and `beforeUpdate` hooks
6. **Handle events** in `afterCreate`, `afterUpdate`, and `afterDelete` hooks
7. **Use whitelists** for relations and select fields to prevent over-fetching
8. **Customize search behavior** using `onListQueryBuilt` hook
9. **Implement proper error handling** for business-specific errors
10. **Use cursor pagination** for large datasets and real-time feeds


