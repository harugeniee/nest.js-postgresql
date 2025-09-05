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
│   ├── 📁 auth/                      # 🎯 Authentication & Authorization
│   │   ├── 📁 guard/                 # Authentication guards
│   │   │   ├── 📄 auth.guard.ts
│   │   │   ├── 📄 jwt-access-token.guard.ts
│   │   │   ├── 📄 jwt-refresh-token.guard.ts
│   │   │   ├── 📄 role.guard.ts
│   │   │   ├── 📄 websocket-auth.guard.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📄 auth.controller.ts
│   │   ├── 📄 auth.service.ts
│   │   └── 📄 auth.module.ts
│   │
│   ├── 📁 common/                    # 🎯 Shared utilities & cross-cutting concerns
│   │   ├── 📁 decorators/            # Custom decorators
│   │   │   ├── 📄 auth.decorator.ts
│   │   │   ├── 📄 client-info.decorator.ts
│   │   │   ├── 📄 match.decorator.ts
│   │   │   ├── 📄 roles.decorator.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 dto/                   # Data Transfer Objects
│   │   │   ├── 📄 advanced-pagination.dto.ts
│   │   │   ├── 📄 cursor-pagination.dto.ts
│   │   │   ├── 📄 graphql-pagination.dto.ts
│   │   │   ├── 📄 pagination.dto.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 events/                # Domain events
│   │   │   └── 📄 domain-events.ts
│   │   ├── 📁 filters/               # Exception filters
│   │   │   ├── 📄 http-exception.filter.ts
│   │   │   └── 📄 ws-exception.filter.ts
│   │   ├── 📁 gateways/              # WebSocket gateways
│   │   │   ├── 📄 base.gateway.ts
│   │   │   ├── 📄 socket.adapter.ts
│   │   │   ├── 📄 index.ts
│   │   │   └── 📄 README.md
│   │   ├── 📁 interface/             # Shared interfaces
│   │   │   ├── 📄 auth.interface.ts
│   │   │   ├── 📄 pagination.interface.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 pipes/                 # Validation & transformation pipes
│   │   │   ├── 📄 snowflake-id.pipe.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 repositories/          # Base repository patterns
│   │   │   ├── 📄 base.repository.ts
│   │   │   └── 📄 typeorm.base-repo.ts
│   │   ├── 📁 services/              # Base service patterns
│   │   │   ├── 📄 base.service.ts
│   │   │   ├── 📄 base.service.spec.ts
│   │   │   ├── 📄 graphql-base.service.ts
│   │   │   ├── 📄 graphql-base.service.spec.ts
│   │   │   ├── 📄 index.ts
│   │   │   └── 📄 README.md
│   │   ├── 📁 subscribers/           # TypeORM subscribers (global)
│   │   │   ├── 📄 audit.subscriber.ts
│   │   │   ├── 📄 cache.subscriber.ts
│   │   │   ├── 📄 metadata.subscriber.ts
│   │   │   ├── 📄 social-media.subscriber.ts
│   │   │   ├── 📄 validation.subscriber.ts
│   │   │   ├── 📄 index.ts
│   │   │   └── 📄 README.md
│   │   └── 📁 utils/                 # Utility functions
│   │       ├── 📄 cursor.util.ts
│   │       ├── 📄 error.util.ts
│   │       ├── 📄 hash.util.ts
│   │       ├── 📄 query.util.ts
│   │       └── 📄 index.ts
│   │
│   ├── 📁 files/                     # 🎯 File management
│   │   ├── 📁 entities/              # File entities
│   │   │   └── 📄 file.entity.ts
│   │   ├── 📄 files.controller.ts
│   │   ├── 📄 files.service.ts
│   │   └── 📄 files.module.ts
│   │
│   ├── 📁 i18n/                      # 🎯 Internationalization
│   │   ├── 📁 en/                    # English translations
│   │   │   ├── 📄 auth.json
│   │   │   ├── 📄 common.json
│   │   │   ├── 📄 qr.json
│   │   │   ├── 📄 test.json
│   │   │   └── 📄 user.json
│   │   └── 📁 vi/                    # Vietnamese translations
│   │       ├── 📄 auth.json
│   │       ├── 📄 common.json
│   │       ├── 📄 qr.json
│   │       ├── 📄 test.json
│   │       └── 📄 user.json
│   │
│   ├── 📁 qr/                        # 🎯 QR Actions feature
│   │   ├── 📁 actions/               # Action implementations
│   │   │   ├── 📄 add-friend.action.ts
│   │   │   ├── 📄 base-action.ts
│   │   │   ├── 📄 join-org.action.ts
│   │   │   ├── 📄 login.action.ts
│   │   │   ├── 📄 pair.action.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 dto/                   # QR DTOs
│   │   │   ├── 📄 approve-ticket.dto.ts
│   │   │   ├── 📄 create-ticket.dto.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 entities/              # QR entities
│   │   │   └── 📄 qr.entity.ts
│   │   ├── 📄 qr-action-executor.service.ts
│   │   ├── 📄 qr.controller.ts
│   │   ├── 📄 qr.gateway.spec.ts
│   │   ├── 📄 qr.gateway.ts
│   │   ├── 📄 qr.module.ts
│   │   ├── 📄 qr.service.spec.ts
│   │   ├── 📄 qr.service.ts
│   │   └── 📄 qr.utils.ts
│   │
│   ├── 📁 shared/                    # 🎯 Infrastructure & configuration
│   │   ├── 📁 config/                # Application configuration
│   │   │   ├── 📄 app.config.ts
│   │   │   ├── 📄 aws.config.ts
│   │   │   ├── 📄 database.config.ts
│   │   │   ├── 📄 mail.config.ts
│   │   │   ├── 📄 oauth.config.ts
│   │   │   ├── 📄 redis.config.ts
│   │   │   ├── 📄 schema.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 constants/             # Application constants
│   │   │   ├── 📄 common.constants.ts
│   │   │   ├── 📄 file.constants.ts
│   │   │   ├── 📄 qr.constants.ts
│   │   │   ├── 📄 user.constants.ts
│   │   │   ├── 📄 worker.constants.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 entities/              # Base entities & shared entities
│   │   │   └── 📄 base.entity.ts
│   │   ├── 📁 helpers/               # Helper functions
│   │   │   ├── 📄 build-response.ts
│   │   │   ├── 📄 condition-builder.ts
│   │   │   ├── 📄 format-i18n-response.ts
│   │   │   ├── 📄 pagination-formatter.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 interceptors/          # Response interceptors
│   │   │   ├── 📄 response.interceptor.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 libs/                  # Shared libraries & utilities
│   │   │   └── 📁 snowflake/
│   │   │       ├── 📄 snowflake.ts
│   │   │       └── 📄 index.ts
│   │   └── 📁 services/              # Core services (Cache, RabbitMQ, Firebase, etc.)
│   │       ├── 📁 axios/             # HTTP client service
│   │       │   ├── 📄 axios.module.ts
│   │       │   └── 📄 axios.service.ts
│   │       ├── 📁 cache/             # Cache service
│   │       │   ├── 📄 cache.module.ts
│   │       │   └── 📄 cache.service.ts
│   │       ├── 📁 firebase/          # Firebase service
│   │       │   ├── 📄 firebase.module.ts
│   │       │   ├── 📄 firebase.service.ts
│   │       │   └── 📄 firebase.types.ts
│   │       ├── 📁 health/            # Health check service
│   │       │   └── 📄 health.service.ts
│   │       ├── 📁 rabbitmq/          # RabbitMQ service
│   │       │   ├── 📄 rabbitmq.module.ts
│   │       │   └── 📄 rabbitmq.service.ts
│   │       └── 📄 index.ts
│   │
│   ├── 📁 users/                     # 🎯 User management
│   │   ├── 📁 dto/                   # User DTOs
│   │   │   ├── 📄 create-device-token.dto.ts
│   │   │   ├── 📄 login.dto.ts
│   │   │   ├── 📄 oauth-login.dto.ts
│   │   │   ├── 📄 register.dto.ts
│   │   │   ├── 📄 session.dto.ts
│   │   │   ├── 📄 update-password.dto.ts
│   │   │   ├── 📄 update-user.dto.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 entities/              # User entities
│   │   │   ├── 📄 user.entity.ts
│   │   │   ├── 📄 user-device-tokens.entity.ts
│   │   │   ├── 📄 user-sessions.entity.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 services/              # User services
│   │   │   ├── 📄 user-device-tokens.service.ts
│   │   │   ├── 📄 user-sessions.service.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📄 users.controller.spec.ts
│   │   ├── 📄 users.controller.ts
│   │   ├── 📄 users.module.ts
│   │   ├── 📄 users.service.spec.ts
│   │   └── 📄 users.service.ts
│   │
│   ├── 📁 workers/                   # 🎯 Background job processing
│   │   ├── 📄 worker.controller.ts
│   │   ├── 📄 worker.module.ts
│   │   └── 📄 worker.service.ts
│   │
│   ├── 📁 db/                        # 🎯 Database migrations
│   │   └── 📁 migrations/            # TypeORM migrations
│   │
│   ├── 📄 app.controller.spec.ts     # Main application controller tests
│   ├── 📄 app.controller.ts          # Main application controller
│   ├── 📄 app.module.ts              # Root application module
│   ├── 📄 app.service.ts             # Main application service
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