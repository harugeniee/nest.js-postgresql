# 🔗 Relations Whitelist Examples

## 📋 Overview

This document provides comprehensive examples of how to use the new `relationsWhitelist` feature in `BaseService`. The relations whitelist now supports `FindOptionsRelations<T>` format, allowing for more granular control over which relations can be loaded.

## 🎯 Key Features

- **Object-based Configuration**: Use `FindOptionsRelations<T>` format instead of string arrays
- **Nested Relations Support**: Define complex nested relation structures
- **Security**: Prevent unauthorized access to sensitive relations
- **Type Safety**: Full TypeScript support with generic types
- **Automatic Filtering**: Relations are automatically filtered based on whitelist

## 🚀 Basic Usage

### 1. Simple Relations Whitelist

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      relationsWhitelist: {
        profile: true,
        roles: true,
        posts: true
      }
    }, cacheService);
  }
}

// Usage
const user = await userService.findById('123', {
  relations: ['profile', 'roles'] // ✅ Allowed
});

const userWithPosts = await userService.findById('123', {
  relations: ['profile', 'posts'] // ✅ Allowed
});

const userWithSensitive = await userService.findById('123', {
  relations: ['sensitiveData'] // ❌ Blocked by whitelist
});
```

### 2. Nested Relations Whitelist

```typescript
@Injectable()
export class PostService extends BaseService<Post> {
  constructor(
    protected readonly repo: BaseRepository<Post>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'Post',
      relationsWhitelist: {
        author: {
          profile: true
        },
        comments: {
          user: {
            profile: true
          },
          replies: true
        },
        tags: true,
        category: true
      }
    }, cacheService);
  }
}

// Usage
const post = await postService.findById('123', {
  relations: {
    author: {
      profile: true
    },
    comments: {
      user: {
        profile: true
      }
    }
  }
}); // ✅ Allowed

const postWithSensitive = await postService.findById('123', {
  relations: {
    author: {
      sensitiveData: true // ❌ Blocked
    }
  }
});
```

## 🔧 Advanced Examples

### 1. E-commerce Product Service

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  reviews: Review[];
  seller: User;
  // ... other fields
}

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(
    protected readonly repo: BaseRepository<Product>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'Product',
      relationsWhitelist: {
        category: true,
        reviews: {
          user: {
            profile: true
          }
        },
        seller: {
          profile: true,
          company: true
        },
        images: true,
        tags: true
        // Exclude sensitive relations like internalNotes, pricingHistory
      }
    }, cacheService);
  }

  // Public product listing - limited relations
  async getPublicProducts(filters: ProductFilters) {
    return this.listOffset({
      page: filters.page,
      limit: filters.limit,
      relations: ['category', 'images', 'tags'] // Only public relations
    });
  }

  // Admin product details - more relations
  async getAdminProductDetails(id: string) {
    return this.findById(id, {
      relations: {
        category: true,
        reviews: {
          user: {
            profile: true
          }
        },
        seller: {
          profile: true,
          company: true
        }
      }
    });
  }
}
```

### 2. Blog System with Complex Relations

```typescript
interface Article {
  id: string;
  title: string;
  content: string;
  author: User;
  comments: Comment[];
  tags: Tag[];
  category: Category;
  // ... other fields
}

@Injectable()
export class ArticleService extends BaseService<Article> {
  constructor(
    protected readonly repo: BaseRepository<Article>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'Article',
      relationsWhitelist: {
        author: {
          profile: true
        },
        comments: {
          author: {
            profile: true
          },
          replies: {
            author: {
              profile: true
            }
          }
        },
        tags: true,
        category: true,
        likes: {
          user: {
            profile: true
          }
        }
      }
    }, cacheService);
  }

  // Get article with full comment thread
  async getArticleWithComments(articleId: string) {
    return this.findById(articleId, {
      relations: {
        author: {
          profile: true
        },
        comments: {
          author: {
            profile: true
          },
          replies: {
            author: {
              profile: true
            }
          }
        },
        tags: true,
        category: true
      }
    });
  }

  // Get article summary for listing
  async getArticleSummary(articleId: string) {
    return this.findById(articleId, {
      relations: ['author', 'tags', 'category'] // Minimal relations
    });
  }
}
```

### 3. User Management with Role-based Relations

```typescript
interface User {
  id: string;
  email: string;
  profile: UserProfile;
  roles: Role[];
  permissions: Permission[];
  sessions: UserSession[];
  // ... other fields
}

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
  ) {
    super(repo, {
      entityName: 'User',
      relationsWhitelist: {
        profile: true,
        roles: {
          permissions: true
        },
        sessions: true,
        // Exclude sensitive relations
        // - passwordResetTokens
        // - apiKeys
        // - auditLogs
      }
    }, cacheService);
  }

  // Public user profile
  async getPublicProfile(userId: string) {
    return this.findById(userId, {
      relations: ['profile'] // Only public profile
    });
  }

  // Admin user details
  async getAdminUserDetails(userId: string) {
    return this.findById(userId, {
      relations: {
        profile: true,
        roles: {
          permissions: true
        },
        sessions: true
      }
    });
  }

  // User's own profile with all allowed relations
  async getOwnProfile(userId: string) {
    return this.findById(userId, {
      relations: {
        profile: true,
        roles: {
          permissions: true
        },
        sessions: true
      }
    });
  }
}
```

## 🛡️ Security Patterns

### 1. Role-based Relations Access

```typescript
@Injectable()
export class SecureUserService extends BaseService<User> {
  constructor(
    protected readonly repo: BaseRepository<User>,
    protected readonly cacheService: CacheService,
    private readonly authService: AuthService,
  ) {
    super(repo, {
      entityName: 'User',
      relationsWhitelist: {
        profile: true,
        roles: true,
        // Sensitive relations excluded by default
      }
    }, cacheService);
  }

  async getUserWithRelations(id: string, currentUser: User) {
    const userRole = await this.authService.getUserRole(currentUser.id);
    
    let allowedRelations: string[] = ['profile'];
    
    if (userRole === 'ADMIN') {
      allowedRelations = ['profile', 'roles', 'sessions', 'auditLogs'];
    } else if (userRole === 'MODERATOR') {
      allowedRelations = ['profile', 'roles'];
    }

    return this.findById(id, {
      relations: allowedRelations
    });
  }
}
```

### 2. Dynamic Relations Based on Context

```typescript
@Injectable()
export class ContextAwareService extends BaseService<Post> {
  async getPostWithContextualRelations(
    postId: string, 
    context: 'public' | 'authenticated' | 'admin'
  ) {
    const relationsMap = {
      public: ['category', 'tags'],
      authenticated: ['category', 'tags', 'author', 'comments'],
      admin: ['category', 'tags', 'author', 'comments', 'moderationLogs', 'analytics']
    };

    return this.findById(postId, {
      relations: relationsMap[context]
    });
  }
}
```

## 🔍 Debugging and Validation

### 1. Check Allowed Relations

```typescript
@Injectable()
export class DebugUserService extends BaseService<User> {
  async debugRelations(userId: string, requestedRelations: string[]) {
    const allowedRelations = this.getAllowedRelations();
    
    console.log('Requested relations:', requestedRelations);
    console.log('Allowed relations:', allowedRelations);
    
    const invalidRelations = requestedRelations.filter(
      rel => !this.isRelationAllowed(rel)
    );
    
    if (invalidRelations.length > 0) {
      throw new BadRequestException(
        `Invalid relations: ${invalidRelations.join(', ')}. ` +
        `Allowed relations: ${allowedRelations.join(', ')}`
      );
    }

    return this.findById(userId, {
      relations: requestedRelations
    });
  }
}
```

### 2. Relations Validation Middleware

```typescript
@Injectable()
export class RelationsValidationPipe implements PipeTransform {
  constructor(private readonly service: BaseService<any>) {}

  transform(value: any) {
    if (value.relations) {
      const relations = Array.isArray(value.relations) 
        ? value.relations 
        : Object.keys(value.relations);
      
      const invalidRelations = relations.filter(
        rel => !this.service.isRelationAllowed(rel)
      );
      
      if (invalidRelations.length > 0) {
        throw new BadRequestException(
          `Invalid relations: ${invalidRelations.join(', ')}`
        );
      }
    }
    
    return value;
  }
}
```

## 📊 Performance Considerations

### 1. Optimize Relations Loading

```typescript
@Injectable()
export class OptimizedPostService extends BaseService<Post> {
  // Lightweight relations for listings
  async getPostsList(filters: PostFilters) {
    return this.listOffset({
      page: filters.page,
      limit: filters.limit,
      relations: ['category', 'author'] // Minimal relations
    });
  }

  // Full relations for detailed view
  async getPostDetails(postId: string) {
    return this.findById(postId, {
      relations: {
        author: {
          profile: true
        },
        comments: {
          author: {
            profile: true
          }
        },
        category: true,
        tags: true
      }
    });
  }
}
```

### 2. Conditional Relations Loading

```typescript
@Injectable()
export class ConditionalPostService extends BaseService<Post> {
  async getPostWithConditionalRelations(
    postId: string, 
    includeComments: boolean = false,
    includeAuthor: boolean = true
  ) {
    const relations: any = {};
    
    if (includeAuthor) {
      relations.author = { profile: true };
    }
    
    if (includeComments) {
      relations.comments = {
        author: { profile: true }
      };
    }
    
    relations.category = true;
    relations.tags = true;

    return this.findById(postId, { relations });
  }
}
```

## 🧪 Testing Relations Whitelist

### 1. Unit Tests

```typescript
describe('UserService Relations Whitelist', () => {
  let service: UserService;

  beforeEach(() => {
    // Setup service with relations whitelist
    service = new UserService(repo, cacheService);
  });

  it('should allow whitelisted relations', async () => {
    const user = await service.findById('123', {
      relations: ['profile', 'roles']
    });
    
    expect(user).toBeDefined();
    expect(user.profile).toBeDefined();
    expect(user.roles).toBeDefined();
  });

  it('should block non-whitelisted relations', async () => {
    await expect(
      service.findById('123', {
        relations: ['sensitiveData']
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow nested whitelisted relations', async () => {
    const user = await service.findById('123', {
      relations: {
        profile: true,
        roles: {
          permissions: true
        }
      }
    });
    
    expect(user.profile).toBeDefined();
    expect(user.roles[0].permissions).toBeDefined();
  });
});
```

### 2. Integration Tests

```typescript
describe('Relations Whitelist Integration', () => {
  it('should filter relations in listOffset', async () => {
    const result = await service.listOffset({
      page: 1,
      limit: 10,
      relations: ['profile', 'invalidRelation']
    });
    
    // Should only load profile relation, ignore invalidRelation
    expect(result.data[0].profile).toBeDefined();
    expect(result.data[0].invalidRelation).toBeUndefined();
  });
});
```

## 🚀 Migration from String Array

### Before (String Array)

```typescript
// Old way
{
  relationsWhitelist: ['profile', 'roles', 'posts']
}
```

### After (Object Format)

```typescript
// New way
{
  relationsWhitelist: {
    profile: true,
    roles: true,
    posts: {
      author: true,
      comments: true
    }
  }
}
```

### Migration Steps

1. **Update Configuration**: Change from string array to object format
2. **Test Relations**: Verify all relations still work correctly
3. **Add Nested Relations**: Take advantage of nested relation support
4. **Update Tests**: Update tests to use new format
5. **Documentation**: Update API documentation

## 📚 Best Practices

### 1. Security First

```typescript
// ✅ Good: Explicitly define allowed relations
{
  relationsWhitelist: {
    profile: true,
    roles: true
    // Sensitive relations excluded
  }
}

// ❌ Bad: Too permissive
{
  relationsWhitelist: {
    // All relations allowed - security risk
  }
}
```

### 2. Performance Optimization

```typescript
// ✅ Good: Minimal relations for listings
async getUsersList() {
  return this.listOffset({
    relations: ['profile'] // Only essential relations
  });
}

// ✅ Good: Full relations for details
async getUserDetails(id: string) {
  return this.findById(id, {
    relations: {
      profile: true,
      roles: { permissions: true }
    }
  });
}
```

### 3. Clear Documentation

```typescript
/**
 * User service with relations whitelist
 * 
 * Allowed relations:
 * - profile: User profile information
 * - roles: User roles and permissions
 * - posts: User's posts (nested with author and comments)
 * 
 * Excluded relations:
 * - passwordResetTokens: Sensitive security data
 * - auditLogs: Internal system logs
 */
@Injectable()
export class UserService extends BaseService<User> {
  // ... implementation
}
```

---

**Relations Whitelist** provides powerful security and performance benefits by giving you fine-grained control over which relations can be loaded. Use it to protect sensitive data while maintaining flexibility for legitimate use cases.
