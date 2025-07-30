# TypeORM Subscribers for Social Media Application

Bộ sưu tập các TypeORM Subscribers được thiết kế đặc biệt cho ứng dụng mạng xã hội như TikTok, Instagram, etc.

## 📋 Danh sách Subscribers

### 1. **MetadataSubscriber**
Tự động quản lý metadata cho tất cả entities.

**Chức năng:**
- Tự động thêm timestamp khi tạo/sửa
- Track IP address và User Agent
- Đếm số lần modification
- Log thông tin chi tiết

**Sử dụng:**
```typescript
// Trong entity
@Entity()
class User extends BaseEntityCustom {
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
```

### 2. **AuditSubscriber**
Log tất cả thay đổi trong database để audit trail.

**Chức năng:**
- Log INSERT, UPDATE, DELETE operations
- Sanitize sensitive data (password, token, etc.)
- Track user thực hiện thay đổi
- Lưu old values và new values

**Sử dụng:**
```typescript
// Tự động log tất cả thay đổi
// Không cần thêm code gì trong entity
```

### 3. **SocialMediaSubscriber**
Xử lý logic đặc biệt cho mạng xã hội.

**Chức năng:**
- **Post Created**: Notify followers, update trending
- **Comment Created**: Notify post author, update comment count
- **Like Created**: Notify content owner, update like count
- **Follow Created**: Notify followed user, update counts
- **User Created**: Send welcome email, suggest follows

**Sử dụng:**
```typescript
// Tự động xử lý khi có entity tương ứng
// Ví dụ: Post, Comment, Like, Follow, User
```

### 4. **CacheSubscriber** ⭐
Tự động invalidate cache khi data thay đổi.

**Chức năng:**
- Invalidate user cache khi user thay đổi
- Invalidate post cache khi post thay đổi
- Invalidate feed cache khi có thay đổi
- Invalidate trending cache

**Cache Keys được quản lý:**
- `user:{id}` - User profile
- `user:posts:{id}` - User posts
- `post:{id}` - Post details
- `posts:trending` - Trending posts
- `feed:user:{id}` - User feed

**Ví dụ cụ thể - User Update Information:**

```typescript
// Khi user cập nhật thông tin
const user = await userService.update(userId, {
  name: 'New Name',
  bio: 'New bio',
  avatar: 'new-avatar.jpg'
});

// CacheSubscriber sẽ tự động xóa các cache keys:
// ✅ user:123
// ✅ user:profile:123  
// ✅ users:trending
// ✅ users:search
// ✅ users:popular
// ✅ users:verified

// Kết quả: Lần sau khi fetch user info sẽ lấy data mới từ DB
```

**Manual Cache Invalidation:**
```typescript
// Trong service
@Injectable()
export class UserService {
  constructor(private cacheSubscriber: CacheSubscriber) {}

  async updateUser(userId: string, data: UpdateUserDto) {
    const user = await this.userRepository.update(userId, data);
    
    // Manual invalidate specific caches
    await this.cacheSubscriber.invalidateUserCaches(userId);
    
    // Invalidate pattern-based caches
    await this.cacheSubscriber.invalidatePattern('users:trending');
    
    return user;
  }
}
```

### 5. **ValidationSubscriber**
Validate data trước khi lưu vào database.

**Chức năng:**
- **User Validation**: Username, email, password, age
- **Post Validation**: Content length, media URLs, hashtags
- **Comment Validation**: Content length, spam prevention
- **Follow Validation**: Prevent self-follow

**Rules:**
- Username: 3-30 chars, alphanumeric + underscore
- Email: Valid email format
- Password: Min 8 chars, uppercase + lowercase + number
- Age: Min 13 years old
- Post content: Max 10,000 chars
- Comment content: Max 1,000 chars
- Media files: Max 10 per post
- Hashtags: Max 30 per post

## 🚀 Cài đặt

### 1. Import Subscribers trong AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import {
  MetadataSubscriber,
  AuditSubscriber,
  SocialMediaSubscriber,
  CacheSubscriber,
  ValidationSubscriber
} from './shared/subscribers';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // ... config
    }),
  ],
  providers: [
    MetadataSubscriber,
    AuditSubscriber,
    SocialMediaSubscriber,
    CacheSubscriber,
    ValidationSubscriber,
  ],
})
export class AppModule {}
```

### 2. Thêm metadata field vào BaseEntity (tùy chọn)

```typescript
// src/shared/entities/base.entity.ts
export abstract class BaseEntityCustom extends BaseEntity {
  // ... existing fields

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
```

## 🔧 Cấu hình

### MetadataSubscriber
```typescript
// Có thể customize trong constructor
constructor(private dataSource: DataSource) {
  this.dataSource.subscribers.push(this);
}
```

### CacheSubscriber
```typescript
// Redis connection được tự động tạo
constructor(private dataSource: DataSource) {
  this.redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  });
}
```

### SocialMediaSubscriber
```typescript
// TODO: Implement notification services
// - Push notification service
// - Email service
// - WebSocket service
```

## 📊 Monitoring

Tất cả subscribers đều có console.log để monitoring:

```bash
[MetadataSubscriber] Record created: User { id: '123', metadata: {...} }
[AuditSubscriber] INSERT on User: {...}
[SocialMediaSubscriber] New user created: 123
[CacheSubscriber] Deleted 8 cache keys: ['user:123', 'user:profile:123', ...]
[ValidationSubscriber] Validating User for INSERT
```

## 🛠️ Customization

### Thêm Entity mới
```typescript
// Trong SocialMediaSubscriber
case 'NewEntity':
  this.handleNewEntityCreated(entity);
  break;

// Trong CacheSubscriber
case 'NewEntity':
  keys.push(
    `newentity:${entityId}`,
    'newentities:list'
  );
  break;
```

### Thêm Validation rules
```typescript
// Trong ValidationSubscriber
private validateNewEntity(entity: any) {
  // Add your validation logic
}
```

## ⚠️ Lưu ý

1. **Performance**: Subscribers chạy synchronously, tránh heavy operations
2. **Error Handling**: Subscribers có thể throw error và rollback transaction
3. **Order**: Subscribers chạy theo thứ tự đăng ký
4. **Testing**: Test subscribers riêng biệt để đảm bảo không ảnh hưởng logic chính

## 🔄 Lifecycle

```
INSERT/UPDATE/DELETE
       ↓
ValidationSubscriber (beforeInsert/beforeUpdate)
       ↓
Database Operation
       ↓
MetadataSubscriber (afterInsert/afterUpdate)
       ↓
AuditSubscriber (afterInsert/afterUpdate)
       ↓
SocialMediaSubscriber (afterInsert/afterUpdate)
       ↓
CacheSubscriber (afterInsert/afterUpdate) ⭐
```

## 📝 TODO

- [x] Implement Redis cache invalidation
- [ ] Add notification services (push, email, websocket)
- [ ] Add request context to get user info
- [ ] Add metrics collection
- [ ] Add error handling and retry logic
- [ ] Add configuration options
- [ ] Add unit tests 