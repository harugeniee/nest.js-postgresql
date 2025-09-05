# 📁 Cấu Trúc Thư Mục Dự Án NestJS

## 🎯 Nguyên Tắc Tổ Chức

### **1. Separation of Concerns (Tách Biệt Mối Quan Tâm)**
- Mỗi thư mục có một mục đích rõ ràng
- Tránh lẫn lộn giữa các layer khác nhau
- Dễ maintain và scale

### **2. Domain-Driven Design (DDD)**
- Tổ chức theo business domain
- Mỗi domain có thể độc lập
- Dễ hiểu và phát triển

### **3. Clean Architecture**
- Dependency Inversion
- Business logic độc lập với framework
- Dễ test và maintain

## 🌳 Cấu Trúc Thư Mục Chi Tiết

```
nest.js-postgresql/
├── 📁 src/
│   ├── 📁 common/                    # 🎯 Shared utilities & cross-cutting concerns
│   │   ├── 📁 subscribers/           # TypeORM subscribers (global)
│   │   │   ├── 📄 cache.subscriber.ts
│   │   │   ├── 📄 audit.subscriber.ts
│   │   │   ├── 📄 social-media.subscriber.ts
│   │   │   ├── 📄 validation.subscriber.ts
│   │   │   ├── 📄 metadata.subscriber.ts
│   │   │   ├── 📄 index.ts
│   │   │   └── 📄 README.md
│   │   ├── 📁 guards/                # Authentication & authorization guards
│   │   │   ├── 📄 jwt-auth.guard.ts
│   │   │   ├── 📄 roles.guard.ts
│   │   │   └── 📄 permissions.guard.ts
│   │   ├── 📁 interceptors/          # Request/Response interceptors
│   │   │   ├── 📄 logging.interceptor.ts
│   │   │   ├── 📄 transform.interceptor.ts
│   │   │   └── 📄 cache.interceptor.ts
│   │   ├── 📁 pipes/                 # Validation & transformation pipes
│   │   │   ├── 📄 validation.pipe.ts
│   │   │   ├── 📄 parse-int.pipe.ts
│   │   │   └── 📄 file-upload.pipe.ts
│   │   ├── 📁 decorators/            # Custom decorators
│   │   │   ├── 📄 roles.decorator.ts
│   │   │   ├── 📄 user.decorator.ts
│   │   │   └── 📄 api-response.decorator.ts
│   │   ├── 📁 filters/               # Exception filters
│   │   │   ├── 📄 http-exception.filter.ts
│   │   │   └── 📄 validation.filter.ts
│   │   └── 📁 constants/             # Global constants
│   │       ├── 📄 app.constants.ts
│   │       └── 📄 error-codes.ts
│   │
│   ├── 📁 shared/                    # 🎯 Infrastructure & configuration
│   │   ├── 📁 config/                # Application configuration
│   │   │   ├── 📄 app.config.ts
│   │   │   ├── 📄 database.config.ts
│   │   │   ├── 📄 redis.config.ts
│   │   │   ├── 📄 aws.config.ts
│   │   │   ├── 📄 mail.config.ts
│   │   │   ├── 📄 oauth.config.ts
│   │   │   ├── 📄 schema.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 entities/              # Base entities & shared entities
│   │   │   ├── 📄 base.entity.ts
│   │   │   ├── 📄 audit.entity.ts
│   │   │   └── 📄 file.entity.ts
│   │   ├── 📁 libs/                  # Shared libraries & utilities
│   │   │   ├── 📁 snowflake/
│   │   │   │   ├── 📄 snowflake.ts
│   │   │   │   └── 📄 index.ts
│   │   │   ├── 📁 encryption/
│   │   │   │   ├── 📄 bcrypt.util.ts
│   │   │   │   └── 📄 jwt.util.ts
│   │   │   ├── 📁 helpers/
│   │   │   │   ├── 📄 date.util.ts
│   │   │   │   ├── 📄 string.util.ts
│   │   │   │   └── 📄 validation.util.ts
│   │   │   └── 📁 types/
│   │   │       ├── 📄 common.types.ts
│   │   │       └── 📄 api.types.ts
│   │   └── 📁 interfaces/            # Shared interfaces & types
│   │       ├── 📄 user.interface.ts
│   │       ├── 📄 api.interface.ts
│   │       └── 📄 database.interface.ts
│   │
│   ├── 📁 modules/                   # 🎯 Business modules (features)
│   │   ├── 📁 auth/                  # Authentication module
│   │   │   ├── 📁 dto/
│   │   │   │   ├── 📄 login.dto.ts
│   │   │   │   ├── 📄 register.dto.ts
│   │   │   │   └── 📄 refresh-token.dto.ts
│   │   │   ├── 📁 entities/
│   │   │   │   ├── 📄 user.entity.ts
│   │   │   │   ├── 📄 role.entity.ts
│   │   │   │   └── 📄 permission.entity.ts
│   │   │   ├── 📁 guards/
│   │   │   │   └── 📄 local-auth.guard.ts
│   │   │   ├── 📁 strategies/
│   │   │   │   ├── 📄 jwt.strategy.ts
│   │   │   │   └── 📄 local.strategy.ts
│   │   │   ├── 📄 auth.controller.ts
│   │   │   ├── 📄 auth.service.ts
│   │   │   ├── 📄 auth.module.ts
│   │   │   └── 📄 auth.spec.ts
│   │   │
│   │   ├── 📁 users/                 # User management module
│   │   │   ├── 📁 dto/
│   │   │   │   ├── 📄 create-user.dto.ts
│   │   │   │   ├── 📄 update-user.dto.ts
│   │   │   │   └── 📄 query-user.dto.ts
│   │   │   ├── 📁 entities/
│   │   │   │   └── 📄 user.entity.ts
│   │   │   ├── 📁 repositories/
│   │   │   │   └── 📄 user.repository.ts
│   │   │   ├── 📄 users.controller.ts
│   │   │   ├── 📄 users.service.ts
│   │   │   ├── 📄 users.module.ts
│   │   │   └── 📄 users.spec.ts
│   │   │
│   │   ├── 📁 posts/                 # Post management module
│   │   │   ├── 📁 dto/
│   │   │   │   ├── 📄 create-post.dto.ts
│   │   │   │   ├── 📄 update-post.dto.ts
│   │   │   │   └── 📄 query-post.dto.ts
│   │   │   ├── 📁 entities/
│   │   │   │   ├── 📄 post.entity.ts
│   │   │   │   ├── 📄 comment.entity.ts
│   │   │   │   └── 📄 like.entity.ts
│   │   │   ├── 📄 posts.controller.ts
│   │   │   ├── 📄 posts.service.ts
│   │   │   ├── 📄 posts.module.ts
│   │   │   └── 📄 posts.spec.ts
│   │   │
│   │   ├── 📁 media/                 # Media management module
│   │   │   ├── 📁 dto/
│   │   │   │   ├── 📄 upload-media.dto.ts
│   │   │   │   └── 📄 process-media.dto.ts
│   │   │   ├── 📁 entities/
│   │   │   │   └── 📄 media.entity.ts
│   │   │   ├── 📁 services/
│   │   │   │   ├── 📄 upload.service.ts
│   │   │   │   ├── 📄 storage.service.ts
│   │   │   │   └── 📄 processing.service.ts
│   │   │   ├── 📄 media.controller.ts
│   │   │   ├── 📄 media.service.ts
│   │   │   ├── 📄 media.module.ts
│   │   │   └── 📄 media.spec.ts
│   │   │
│   │   ├── 📁 notifications/         # Notification module
│   │   │   ├── 📁 dto/
│   │   │   │   ├── 📄 create-notification.dto.ts
│   │   │   │   └── 📄 update-notification.dto.ts
│   │   │   ├── 📁 entities/
│   │   │   │   └── 📄 notification.entity.ts
│   │   │   ├── 📁 services/
│   │   │   │   ├── 📄 email.service.ts
│   │   │   │   ├── 📄 push.service.ts
│   │   │   │   └── 📄 websocket.service.ts
│   │   │   ├── 📄 notifications.controller.ts
│   │   │   ├── 📄 notifications.service.ts
│   │   │   ├── 📄 notifications.module.ts
│   │   │   └── 📄 notifications.spec.ts
│   │   │
│   │   └── 📁 analytics/             # Analytics module
│   │       ├── 📁 dto/
│   │       │   ├── 📄 track-event.dto.ts
│   │       │   └── 📄 analytics-query.dto.ts
│   │       ├── 📁 entities/
│   │       │   ├── 📄 event.entity.ts
│   │       │   └── 📄 metric.entity.ts
│   │       ├── 📄 analytics.controller.ts
│   │       ├── 📄 analytics.service.ts
│   │       ├── 📄 analytics.module.ts
│   │       └── 📄 analytics.spec.ts
│   │
│   ├── 📁 infrastructure/            # 🎯 External services & adapters
│   │   ├── 📁 database/              # Database related
│   │   │   ├── 📁 migrations/
│   │   │   │   ├── 📄 001-create-users.ts
│   │   │   │   ├── 📄 002-create-posts.ts
│   │   │   │   └── 📄 003-create-comments.ts
│   │   │   ├── 📁 seeds/
│   │   │   │   ├── 📄 user.seed.ts
│   │   │   │   └── 📄 post.seed.ts
│   │   │   └── 📄 database.module.ts
│   │   ├── 📁 cache/                 # Cache related
│   │   │   ├── 📄 redis.service.ts
│   │   │   ├── 📄 cache.service.ts
│   │   │   └── 📄 cache.module.ts
│   │   ├── 📁 storage/               # File storage
│   │   │   ├── 📄 s3.service.ts
│   │   │   ├── 📄 local-storage.service.ts
│   │   │   └── 📄 storage.module.ts
│   │   ├── 📁 external/              # External APIs
│   │   │   ├── 📄 payment.service.ts
│   │   │   ├── 📄 sms.service.ts
│   │   │   └── 📄 external.module.ts
│   │   └── 📁 logging/               # Logging services
│   │       ├── 📄 logger.service.ts
│   │       ├── 📄 winston.config.ts
│   │       └── 📄 logging.module.ts
│   │
│   ├── 📁 core/                      # 🎯 Core business logic
│   │   ├── 📁 domain/                # Domain entities & business rules
│   │   │   ├── 📁 user/
│   │   │   │   ├── 📄 user.domain.ts
│   │   │   │   ├── 📄 user.repository.interface.ts
│   │   │   │   └── 📄 user.service.interface.ts
│   │   │   ├── 📁 post/
│   │   │   │   ├── 📄 post.domain.ts
│   │   │   │   ├── 📄 post.repository.interface.ts
│   │   │   │   └── 📄 post.service.interface.ts
│   │   │   └── 📁 shared/
│   │   │       ├── 📄 base.domain.ts
│   │   │       └── 📄 value-objects.ts
│   │   ├── 📁 use-cases/             # Application use cases
│   │   │   ├── 📁 user/
│   │   │   │   ├── 📄 create-user.use-case.ts
│   │   │   │   ├── 📄 update-user.use-case.ts
│   │   │   │   └── 📄 delete-user.use-case.ts
│   │   │   ├── 📁 post/
│   │   │   │   ├── 📄 create-post.use-case.ts
│   │   │   │   ├── 📄 like-post.use-case.ts
│   │   │   │   └── 📄 share-post.use-case.ts
│   │   │   └── 📁 shared/
│   │   │       └── 📄 base.use-case.ts
│   │   └── 📁 exceptions/            # Domain exceptions
│   │       ├── 📄 domain.exception.ts
│   │       ├── 📄 business-rule.exception.ts
│   │       └── 📄 validation.exception.ts
│   │
│   ├── 📄 app.controller.ts          # Main application controller
│   ├── 📄 app.service.ts             # Main application service
│   ├── 📄 app.module.ts              # Root application module
│   └── 📄 main.ts                    # Application entry point
│
├── 📁 test/                          # 🎯 Test files
│   ├── 📁 e2e/                       # End-to-end tests
│   │   ├── 📄 app.e2e-spec.ts
│   │   ├── 📄 auth.e2e-spec.ts
│   │   └── 📄 users.e2e-spec.ts
│   ├── 📁 integration/               # Integration tests
│   │   ├── 📄 database.integration.spec.ts
│   │   └── 📄 cache.integration.spec.ts
│   ├── 📁 unit/                      # Unit tests
│   │   ├── 📄 services/
│   │   ├── 📄 controllers/
│   │   └── 📄 use-cases/
│   └── 📁 fixtures/                  # Test data
│       ├── 📄 users.fixture.ts
│       └── 📄 posts.fixture.ts
│
├── 📁 docs/                          # 🎯 Documentation
│   ├── 📄 API.md                     # API documentation
│   ├── 📄 DEPLOYMENT.md              # Deployment guide
│   ├── 📄 CONTRIBUTING.md            # Contributing guidelines
│   └── 📄 ARCHITECTURE.md            # Architecture documentation
│
├── 📁 scripts/                       # 🎯 Build & deployment scripts
│   ├── 📄 build.sh
│   ├── 📄 deploy.sh
│   ├── 📄 migrate.sh
│   └── 📄 seed.sh
│
├── 📁 docker/                        # 🎯 Docker configuration
│   ├── 📄 Dockerfile
│   ├── 📄 docker-compose.yml
│   ├── 📄 docker-compose.dev.yml
│   └── 📄 docker-compose.prod.yml
│
├── 📄 .env.example                   # Environment variables example
├── 📄 .env                           # Environment variables (gitignored)
├── 📄 .gitignore                     # Git ignore rules
├── 📄 package.json                   # Dependencies & scripts
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 nest-cli.json                  # NestJS CLI configuration
├── 📄 README.md                      # Project overview
└── 📄 PROJECT_STRUCTURE.md           # This file
```

## 🎯 Giải Thích Chi Tiết Từng Thư Mục

### **📁 `src/common/` - Cross-Cutting Concerns**
**Mục đích:** Chứa các utilities và components được sử dụng xuyên suốt ứng dụng

**Lý do tổ chức:**
- ✅ **Reusability**: Có thể tái sử dụng ở nhiều nơi
- ✅ **Consistency**: Đảm bảo tính nhất quán
- ✅ **Maintainability**: Dễ maintain và update
- ✅ **NestJS Convention**: Theo chuẩn của NestJS

**Chức năng:**
- `subscribers/`: TypeORM subscribers (global)
- `guards/`: Authentication & authorization
- `interceptors/`: Request/Response processing
- `pipes/`: Data validation & transformation
- `decorators/`: Custom decorators
- `filters/`: Exception handling
- `constants/`: Global constants

### **📁 `src/shared/` - Infrastructure & Configuration**
**Mục đích:** Chứa các cấu hình và infrastructure components

**Lý do tổ chức:**
- ✅ **Configuration Management**: Tập trung quản lý config
- ✅ **Infrastructure Separation**: Tách biệt infrastructure
- ✅ **Reusability**: Shared across modules
- ✅ **Environment Specific**: Dễ thay đổi theo environment

**Chức năng:**
- `config/`: Application configuration
- `entities/`: Base entities
- `libs/`: Shared libraries
- `interfaces/`: Shared interfaces

### **📁 `src/modules/` - Business Features**
**Mục đích:** Chứa các business modules theo domain

**Lý do tổ chức:**
- ✅ **Domain Separation**: Tách biệt theo business domain
- ✅ **Scalability**: Dễ thêm module mới
- ✅ **Team Collaboration**: Mỗi team có thể làm module riêng
- ✅ **Testing**: Dễ test từng module

**Chức năng:**
- `auth/`: Authentication & authorization
- `users/`: User management
- `posts/`: Post management
- `media/`: Media handling
- `notifications/`: Notification system
- `analytics/`: Analytics & tracking

### **📁 `src/infrastructure/` - External Services**
**Mục đích:** Chứa các adapter và external services

**Lý do tổ chức:**
- ✅ **External Dependencies**: Tách biệt external services
- ✅ **Adapter Pattern**: Implement adapter pattern
- ✅ **Testability**: Dễ mock external services
- ✅ **Flexibility**: Dễ thay đổi external providers

**Chức năng:**
- `database/`: Database operations
- `cache/`: Caching layer
- `storage/`: File storage
- `external/`: External APIs
- `logging/`: Logging services

### **📁 `src/core/` - Core Business Logic**
**Mục đích:** Chứa core business logic và domain rules

**Lý do tổ chức:**
- ✅ **Clean Architecture**: Theo nguyên tắc Clean Architecture
- ✅ **Domain-Driven Design**: Tập trung vào business domain
- ✅ **Independence**: Độc lập với framework
- ✅ **Testability**: Dễ test business logic

**Chức năng:**
- `domain/`: Domain entities & business rules
- `use-cases/`: Application use cases
- `exceptions/`: Domain exceptions

## 🔄 Quy Tắc Đặt Tên

### **1. File Naming Convention**
```typescript
// ✅ Good
user.service.ts
user.controller.ts
user.entity.ts
user.dto.ts
user.module.ts

// ❌ Bad
UserService.ts
user_service.ts
userService.ts
```

### **2. Folder Naming Convention**
```typescript
// ✅ Good
src/modules/users/
src/common/guards/
src/shared/config/

// ❌ Bad
src/Modules/Users/
src/Common/Guards/
src/Shared/Config/
```

### **3. Import Path Convention**
```typescript
// ✅ Good - Relative imports
import { UserService } from '../services/user.service';
import { CreateUserDto } from './dto/create-user.dto';

// ✅ Good - Absolute imports (with path mapping)
import { UserService } from '@modules/users/user.service';
import { BaseEntity } from '@shared/entities/base.entity';

// ❌ Bad - Deep relative imports
import { UserService } from '../../../../services/user.service';
```

## 🎯 Best Practices

### **1. Module Organization**
```typescript
// Mỗi module nên có cấu trúc nhất quán
module/
├── dto/           # Data Transfer Objects
├── entities/      # Database entities
├── repositories/  # Data access layer
├── services/      # Business logic
├── controllers/   # HTTP endpoints
├── guards/        # Module-specific guards
├── interceptors/  # Module-specific interceptors
├── module.ts      # Module definition
└── *.spec.ts      # Tests
```

### **2. Dependency Injection**
```typescript
// ✅ Good - Inject dependencies
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
  ) {}
}

// ❌ Bad - Create instances manually
export class UserService {
  private userRepository = new Repository<User>();
  private cacheService = new CacheService();
}
```

### **3. Error Handling**
```typescript
// ✅ Good - Use custom exceptions
throw new UserNotFoundException(userId);

// ❌ Bad - Use generic errors
throw new Error('User not found');
```

## 🚀 Migration Guide

### **Từ cấu trúc cũ sang mới:**

1. **Tạo thư mục mới:**
```bash
mkdir -p src/{common,modules,infrastructure,core}
```

2. **Di chuyển files:**
```bash
# Move subscribers
mv src/shared/subscribers/* src/common/subscribers/

# Move modules
mv src/users src/modules/
mv src/auth src/modules/

# Move config
# Keep src/shared/config/ as is
```

3. **Update imports:**
```typescript
// Old
import { UserService } from '../users/users.service';

// New
import { UserService } from '@modules/users/user.service';
```

4. **Update tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@common/*": ["src/common/*"],
      "@shared/*": ["src/shared/*"],
      "@modules/*": ["src/modules/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@core/*": ["src/core/*"]
    }
  }
}
```

## 📊 Monitoring & Maintenance

### **1. Code Quality**
- ESLint rules cho từng thư mục
- Prettier configuration
- Husky pre-commit hooks

### **2. Documentation**
- README cho mỗi module
- API documentation
- Architecture decisions

### **3. Testing Strategy**
- Unit tests cho services
- Integration tests cho modules
- E2E tests cho workflows

### **4. Performance Monitoring**
- Bundle size analysis
- Import cost tracking
- Circular dependency detection

---

**Lưu ý:** Cấu trúc này có thể điều chỉnh theo quy mô dự án và team size. Với dự án nhỏ, có thể gộp một số thư mục lại. 