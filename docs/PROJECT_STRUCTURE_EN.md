# 📁 Project Structure for NestJS Application

## 🎯 Organization Principles

### **1. Separation of Concerns**
- Each directory has a clear purpose
- Avoid mixing different layers
- Easy to maintain and scale

### **2. Domain-Driven Design (DDD)**
- Organize by business domain
- Each domain can be independent
- Easy to understand and develop

### **3. Clean Architecture**
- Dependency Inversion
- Business logic independent of framework
- Easy to test and maintain

## 🌳 Detailed Directory Structure

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
│   ├── 📁 rate-limit/                # 🎯 Rate limiting system
│   │   ├── 📁 admin/                 # Admin management
│   │   ├── 📁 dto/                   # Rate limit DTOs
│   │   │   ├── 📄 plan.dto.ts
│   │   │   ├── 📄 api-key.dto.ts
│   │   │   ├── 📄 ip-whitelist.dto.ts
│   │   │   ├── 📄 rate-limit-policy.dto.ts
│   │   │   └── 📄 index.ts
│   │   ├── 📁 entities/              # Rate limit entities
│   │   │   ├── 📄 plan.entity.ts
│   │   │   ├── 📄 api-key.entity.ts
│   │   │   ├── 📄 ip-whitelist.entity.ts
│   │   │   ├── 📄 rate-limit-policy.entity.ts
│   │   │   ├── 📄 rate-limit-log.entity.ts
│   │   │   └── 📄 README.md
│   │   ├── 📄 rate-limit-admin.controller.ts
│   │   ├── 📄 rate-limit.decorator.ts
│   │   ├── 📄 rate-limit.guard.ts
│   │   ├── 📄 rate-limit.module.ts
│   │   ├── 📄 rate-limit.service.ts
│   │   └── 📄 README.md
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
└── 📄 PROJECT_STRUCTURE_EN.md        # This file
```

## 🎯 Detailed Explanation of Each Directory

### **📁 `src/common/` - Cross-Cutting Concerns**
**Purpose:** Contains utilities and components used throughout the application

**Reasons for organization:**
- ✅ **Reusability**: Can be reused in multiple places
- ✅ **Consistency**: Ensures consistency across the application
- ✅ **Maintainability**: Easy to maintain and update
- ✅ **NestJS Convention**: Follows NestJS standards

**Functions:**
- `subscribers/`: TypeORM subscribers (global)
- `guards/`: Authentication & authorization
- `interceptors/`: Request/Response processing
- `pipes/`: Data validation & transformation
- `decorators/`: Custom decorators
- `filters/`: Exception handling
- `constants/`: Global constants

### **📁 `src/shared/` - Infrastructure & Configuration**
**Purpose:** Contains configuration and infrastructure components

**Reasons for organization:**
- ✅ **Configuration Management**: Centralized configuration management
- ✅ **Infrastructure Separation**: Separates infrastructure concerns
- ✅ **Reusability**: Shared across modules
- ✅ **Environment Specific**: Easy to change per environment

**Functions:**
- `config/`: Application configuration
- `entities/`: Base entities
- `libs/`: Shared libraries
- `interfaces/`: Shared interfaces

### **📁 `src/auth/` - Authentication & Authorization**
**Purpose:** Handles user authentication and authorization

**Reasons for organization:**
- ✅ **Security Focus**: Centralized security concerns
- ✅ **Guard Management**: All authentication guards in one place
- ✅ **JWT Handling**: Token-based authentication
- ✅ **WebSocket Auth**: Specialized WebSocket authentication

**Functions:**
- `guard/`: Authentication guards (JWT, roles, WebSocket)
- `auth.controller.ts`: Authentication endpoints
- `auth.service.ts`: Authentication business logic
- `auth.module.ts`: Authentication module configuration

### **📁 `src/users/` - User Management**
**Purpose:** Manages user data and user-related operations

**Reasons for organization:**
- ✅ **User Domain**: All user-related functionality
- ✅ **Device Management**: Device token handling
- ✅ **Session Management**: User session tracking
- ✅ **OAuth Integration**: Social login support

**Functions:**
- `dto/`: User data transfer objects
- `entities/`: User database entities
- `services/`: User-related services
- `users.controller.ts`: User management endpoints
- `users.service.ts`: User business logic

### **📁 `src/qr/` - QR Actions Feature**
**Purpose:** Implements QR code-based secure actions

**Reasons for organization:**
- ✅ **Security**: PKCE-based secure QR actions
- ✅ **Real-time**: WebSocket integration for live updates
- ✅ **Modular**: Pluggable action system
- ✅ **Scalable**: Redis-based state management

**Functions:**
- `actions/`: Action implementations (login, add friend, join org, pair)
- `dto/`: QR-related data transfer objects
- `entities/`: QR database entities
- `qr.controller.ts`: QR API endpoints
- `qr.gateway.ts`: WebSocket gateway for real-time updates
- `qr.service.ts`: QR business logic

### **📁 `src/files/` - File Management**
**Purpose:** Handles file upload, storage, and management

**Reasons for organization:**
- ✅ **File Operations**: Centralized file handling
- ✅ **Storage Integration**: Multiple storage backends
- ✅ **Security**: File validation and security
- ✅ **Performance**: Efficient file operations

**Functions:**
- `entities/`: File database entities
- `files.controller.ts`: File management endpoints
- `files.service.ts`: File business logic
- `files.module.ts`: File module configuration

### **📁 `src/i18n/` - Internationalization**
**Purpose:** Provides multi-language support

**Reasons for organization:**
- ✅ **Localization**: Multi-language support
- ✅ **Maintainability**: Easy to add new languages
- ✅ **Consistency**: Centralized translation management
- ✅ **Performance**: Efficient translation loading

**Functions:**
- `en/`: English translations
- `vi/`: Vietnamese translations
- Language-specific JSON files for different modules

### **📁 `src/workers/` - Background Job Processing**
**Purpose:** Handles background tasks and job processing

**Reasons for organization:**
- ✅ **Async Processing**: Background task execution
- ✅ **Job Management**: Queue-based job processing
- ✅ **Scalability**: Distributed job processing
- ✅ **Reliability**: Job retry and error handling

**Functions:**
- `worker.controller.ts`: Worker management endpoints
- `worker.service.ts`: Job processing logic
- `worker.module.ts`: Worker module configuration

## 🔄 Naming Conventions

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
// Each module should have consistent structure
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

### **Current Structure Organization:**

The current structure follows a flat module organization where each major feature is a top-level module in the `src/` directory:

1. **Module Organization:**
```bash
src/
├── auth/          # Authentication & Authorization
├── users/         # User Management
├── qr/           # QR Actions Feature
├── files/        # File Management
├── workers/      # Background Jobs
├── common/       # Shared utilities
└── shared/       # Infrastructure & config
```

2. **Import Paths:**
```typescript
// Current structure uses relative imports
import { UserService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { QrService } from '../qr/qr.service';

// Or absolute imports from src root
import { UserService } from 'src/users/users.service';
import { BaseEntity } from 'src/shared/entities/base.entity';
```

3. **Module Dependencies:**
```typescript
// Each module is self-contained with its own:
// - DTOs
// - Entities  
// - Services
// - Controllers
// - Module definition
```

## 📊 Monitoring & Maintenance

### **1. Code Quality**
- ESLint rules for each directory
- Prettier configuration
- Husky pre-commit hooks

### **2. Documentation**
- README for each module
- API documentation
- Architecture decisions

### **3. Testing Strategy**
- Unit tests for services
- Integration tests for modules
- E2E tests for workflows

### **4. Performance Monitoring**
- Bundle size analysis
- Import cost tracking
- Circular dependency detection

---

**Note:** This structure can be adjusted based on project scale and team size. For small projects, some directories can be merged. 