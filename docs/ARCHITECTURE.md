# NestJS PostgreSQL Architecture Documentation

## Overview
This is an enterprise-grade NestJS application built with modern best practices, featuring PostgreSQL, Redis, RabbitMQ, and comprehensive security measures.

## Architecture Principles

### 1. **Clean Architecture**
- **Separation of Concerns**: Clear boundaries between layers
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each class has one reason to change

### 2. **Security First**
- **Helmet.js**: Security headers and protection
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive validation with class-validator
- **CORS Configuration**: Controlled cross-origin access

### 3. **Performance & Scalability**
- **Connection Pooling**: Database connection management
- **Redis Caching**: Multi-layer caching strategy
- **Message Queues**: Asynchronous processing with RabbitMQ
- **Optimistic Locking**: Concurrent access control

## Project Structure

```
src/
├── auth/                 # Authentication & Authorization
│   ├── guard/           # Authentication guards
│   │   ├── auth.guard.ts
│   │   ├── jwt-access-token.guard.ts
│   │   ├── jwt-refresh-token.guard.ts
│   │   ├── role.guard.ts
│   │   ├── websocket-auth.guard.ts
│   │   └── index.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── common/              # Shared utilities & cross-cutting concerns
│   ├── decorators/     # Custom decorators
│   │   ├── auth.decorator.ts
│   │   ├── client-info.decorator.ts
│   │   ├── match.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── index.ts
│   ├── dto/            # Data Transfer Objects
│   │   ├── advanced-pagination.dto.ts
│   │   ├── cursor-pagination.dto.ts
│   │   ├── graphql-pagination.dto.ts
│   │   ├── pagination.dto.ts
│   │   └── index.ts
│   ├── events/         # Domain events
│   │   └── domain-events.ts
│   ├── filters/        # Exception filters
│   │   ├── http-exception.filter.ts
│   │   └── ws-exception.filter.ts
│   ├── gateways/       # WebSocket gateways
│   │   ├── base.gateway.ts
│   │   ├── socket.adapter.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── interface/      # Shared interfaces
│   │   ├── auth.interface.ts
│   │   ├── pagination.interface.ts
│   │   └── index.ts
│   ├── pipes/          # Validation pipes
│   │   ├── snowflake-id.pipe.ts
│   │   └── index.ts
│   ├── repositories/   # Base repository patterns
│   │   ├── base.repository.ts
│   │   └── typeorm.base-repo.ts
│   ├── services/       # Base service patterns
│   │   ├── base.service.ts
│   │   ├── base.service.spec.ts
│   │   ├── graphql-base.service.ts
│   │   ├── graphql-base.service.spec.ts
│   │   ├── index.ts
│   │   └── README.md
│   ├── subscribers/    # TypeORM subscribers
│   │   ├── audit.subscriber.ts
│   │   ├── cache.subscriber.ts
│   │   ├── metadata.subscriber.ts
│   │   ├── social-media.subscriber.ts
│   │   ├── validation.subscriber.ts
│   │   ├── index.ts
│   │   └── README.md
│   └── utils/          # Utility functions
│       ├── cursor.util.ts
│       ├── error.util.ts
│       ├── hash.util.ts
│       ├── query.util.ts
│       └── index.ts
├── files/              # File management
│   ├── entities/       # File entities
│   │   └── file.entity.ts
│   ├── files.controller.ts
│   ├── files.service.ts
│   └── files.module.ts
├── i18n/               # Internationalization
│   ├── en/             # English translations
│   │   ├── auth.json
│   │   ├── common.json
│   │   ├── qr.json
│   │   ├── test.json
│   │   └── user.json
│   └── vi/             # Vietnamese translations
│       ├── auth.json
│       ├── common.json
│       ├── qr.json
│       ├── test.json
│       └── user.json
├── qr/                 # QR Actions feature
│   ├── actions/        # Action implementations
│   │   ├── add-friend.action.ts
│   │   ├── base-action.ts
│   │   ├── join-org.action.ts
│   │   ├── login.action.ts
│   │   ├── pair.action.ts
│   │   └── index.ts
│   ├── dto/            # QR DTOs
│   │   ├── approve-ticket.dto.ts
│   │   ├── create-ticket.dto.ts
│   │   └── index.ts
│   ├── entities/       # QR entities
│   │   └── qr.entity.ts
│   ├── qr-action-executor.service.ts
│   ├── qr.controller.ts
│   ├── qr.gateway.spec.ts
│   ├── qr.gateway.ts
│   ├── qr.module.ts
│   ├── qr.service.spec.ts
│   ├── qr.service.ts
│   └── qr.utils.ts
├── rate-limit/         # Rate limiting system
│   ├── admin/          # Admin management
│   ├── dto/            # Rate limit DTOs
│   ├── entities/       # Rate limit entities
│   │   ├── plan.entity.ts
│   │   ├── api-key.entity.ts
│   │   ├── ip-whitelist.entity.ts
│   │   ├── rate-limit-policy.entity.ts
│   │   ├── rate-limit-log.entity.ts
│   │   └── README.md
│   ├── rate-limit-admin.controller.ts
│   ├── rate-limit.decorator.ts
│   ├── rate-limit.guard.ts
│   ├── rate-limit.module.ts
│   ├── rate-limit.service.ts
│   └── README.md
├── shared/             # Shared services & configurations
│   ├── config/         # Environment configuration
│   │   ├── app.config.ts
│   │   ├── aws.config.ts
│   │   ├── database.config.ts
│   │   ├── mail.config.ts
│   │   ├── oauth.config.ts
│   │   ├── redis.config.ts
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── constants/      # Application constants
│   │   ├── common.constants.ts
│   │   ├── file.constants.ts
│   │   ├── qr.constants.ts
│   │   ├── user.constants.ts
│   │   ├── worker.constants.ts
│   │   └── index.ts
│   ├── entities/       # Base entities
│   │   └── base.entity.ts
│   ├── helpers/        # Helper functions
│   │   ├── build-response.ts
│   │   ├── condition-builder.ts
│   │   ├── format-i18n-response.ts
│   │   ├── pagination-formatter.ts
│   │   └── index.ts
│   ├── interceptors/   # Response interceptors
│   │   ├── response.interceptor.ts
│   │   └── index.ts
│   ├── libs/           # External library integrations
│   │   └── snowflake/
│   │       ├── snowflake.ts
│   │       └── index.ts
│   └── services/       # Core services (Cache, RabbitMQ, Firebase, etc.)
│       ├── axios/      # HTTP client service
│       │   ├── axios.module.ts
│       │   └── axios.service.ts
│       ├── cache/      # Cache service
│       │   ├── cache.module.ts
│       │   └── cache.service.ts
│       ├── firebase/   # Firebase service
│       │   ├── firebase.module.ts
│       │   ├── firebase.service.ts
│       │   └── firebase.types.ts
│       ├── health/     # Health check service
│       │   └── health.service.ts
│       ├── rabbitmq/   # RabbitMQ service
│       │   ├── rabbitmq.module.ts
│       │   └── rabbitmq.service.ts
│       └── index.ts
├── users/              # User management
│   ├── dto/            # User DTOs
│   │   ├── create-device-token.dto.ts
│   │   ├── login.dto.ts
│   │   ├── oauth-login.dto.ts
│   │   ├── register.dto.ts
│   │   ├── session.dto.ts
│   │   ├── update-password.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── index.ts
│   ├── entities/       # User entities
│   │   ├── user.entity.ts
│   │   ├── user-device-tokens.entity.ts
│   │   ├── user-sessions.entity.ts
│   │   └── index.ts
│   ├── services/       # User services
│   │   ├── user-device-tokens.service.ts
│   │   ├── user-sessions.service.ts
│   │   └── index.ts
│   ├── users.controller.spec.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   ├── users.service.spec.ts
│   └── users.service.ts
└── workers/            # Background job processing
    ├── worker.controller.ts
    ├── worker.module.ts
    └── worker.service.ts
```

## Key Components

### 1. **Base Entity System**
```typescript
export abstract class BaseEntityCustom extends BaseEntity {
  @PrimaryColumn('bigint')
  id!: string;                    // Snowflake ID
  
  @Index({ unique: true })
  @Column('uuid')
  uuid!: string;                  // External reference UUID
  
  @CreateDateColumn()
  createdAt!: Date;               // Creation timestamp
  
  @UpdateDateColumn()
  updatedAt!: Date;               // Update timestamp
  
  @DeleteDateColumn()
  deletedAt!: Date | null;        // Soft delete support
  
  @VersionColumn()
  version!: number;               // Optimistic locking
}
```

### 2. **Cache Service**
- **Multi-layer caching**: Redis with fallback strategies
- **Pattern-based operations**: Safe key deletion with SCAN
- **Atomic operations**: Lua scripts for complex operations
- **Distributed locking**: Redis-based lock mechanism

### 3. **Database Configuration**
- **Connection pooling**: Configurable pool sizes
- **SSL support**: Production-ready security
- **Migration management**: TypeORM CLI integration
- **Entity auto-loading**: Automatic entity discovery

### 4. **Security Features**
- **Rate Limiting**: Per-client API protection
- **Input Validation**: Comprehensive DTO validation
- **Error Handling**: Structured error responses
- **Logging**: Structured logging with different levels

### 5. **QR Actions System**
- **PKCE Security**: Proof Key for Code Exchange implementation
- **Real-time Updates**: WebSocket-based status notifications
- **Action Framework**: Pluggable action system for different operations
- **Redis State Management**: Ephemeral ticket and grant storage
- **Multi-language Support**: Internationalized error messages
- **Supported Actions**: Login, Add Friend, Join Organization, Device Pairing

### 6. **Rate Limiting System**
- **Dynamic Rate Limiting**: Based on API keys, plans, and IP whitelisting
- **Multiple Strategies**: Fixed Window, Sliding Window, Token Bucket
- **Policy-based Rules**: Flexible configuration with priority system
- **Admin Management**: Full CRUD operations for plans, API keys, and policies
- **Redis Integration**: Distributed rate limiting with cache invalidation
- **Hot Reload**: Real-time policy updates without restart

### 7. **WebSocket Support**
- **Redis Adapter**: Scalable WebSocket communication
- **Real-time Features**: Live updates for QR actions and notifications
- **Authentication**: JWT-based WebSocket authentication
- **Exception Handling**: Dedicated WebSocket exception filters

## Configuration Management

### Environment Variables
```bash
# Core Configuration
NODE_ENV=development
PORT=3000
TZ=UTC

# Security
JWT_SECRET=your-32-char-secret
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Internationalization
I18N_FALLBACK_LANGUAGE=en
I18N_SUPPORTED_LANGUAGES=en,vi

# QR Configuration
QR_HMAC_SECRET=your-hmac-secret
CURSOR_HMAC_SECRET=your-cursor-hmac-secret
QR_TICKET_TTL_SECONDS=180
QR_GRANT_TTL_SECONDS=30

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=nest_app
DATABASE_URL=postgresql://postgres:password@localhost:5432/nest_app
DATABASE_SYNCHRONIZE=false

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=nest_app_queue
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=admin_password

# CORS
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
RATE_LIMIT_REDIS_URL=redis://localhost:6379/1
RATE_LIMIT_CACHE_TTL=300
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT_PLAN=anonymous

# Logging
LOG_LEVEL=info

# WebSocket
WS_ADAPTER_ENABLED=false
```

### Configuration Validation
- **Joi Schema**: Runtime environment validation
- **Type Safety**: TypeScript configuration interfaces
- **Default Values**: Sensible defaults for development

## Development Workflow

### 1. **Code Quality**
```bash
# Linting
yarn lint              # Fix auto-fixable issues

# Formatting
yarn format            # Format all files

# Testing
yarn test              # Unit tests
yarn test:watch        # Watch mode for tests
yarn test:cov          # Coverage report
yarn test:debug        # Debug mode for tests
yarn test:e2e          # End-to-end tests
```

### 2. **Database Management**
```bash
# Migrations
yarn migration:generate # Generate new migration
yarn migration:run      # Apply migrations
yarn migration:revert   # Revert last migration

# TypeORM CLI
yarn typeorm           # Access TypeORM CLI
yarn mg                # Generate migration script
```

### 3. **Application Management**
```bash
# Development
yarn start:dev           # Start in development mode with watch
yarn start:debug         # Start in debug mode
yarn start:prod          # Start in production mode

# Building
yarn build               # Build the application
```

## Performance Considerations

### 1. **Database Optimization**
- **Indexing Strategy**: Strategic index placement
- **Query Optimization**: Efficient query patterns
- **Connection Pooling**: Optimal pool sizing
- **Migration Strategy**: Zero-downtime deployments

### 2. **Caching Strategy**
- **Multi-level Caching**: Application + Redis layers
- **Cache Invalidation**: Smart invalidation patterns
- **Memory Management**: Efficient memory usage
- **Pattern Operations**: Safe bulk operations

### 3. **Message Queue Patterns**
- **Dead Letter Queues**: Failed message handling
- **Message Persistence**: Durable message storage
- **Consumer Patterns**: Efficient message processing
- **Load Balancing**: Multiple consumer instances

## Security Measures

### 1. **API Protection**
- **Rate Limiting**: Per-client request limits
- **Input Validation**: Comprehensive input sanitization
- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control

### 2. **Data Protection**
- **Encryption**: Sensitive data encryption
- **Audit Logging**: Comprehensive audit trails
- **Soft Deletes**: Data retention compliance
- **Access Control**: Fine-grained permissions

## Monitoring & Observability

### 1. **Health Checks**
- **Service Health**: Database, Redis, RabbitMQ status
- **Performance Metrics**: Response times, memory usage
- **Error Tracking**: Structured error logging
- **Uptime Monitoring**: Service availability

### 2. **Logging Strategy**
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Configurable verbosity
- **Context Information**: Request correlation
- **Performance Tracking**: Operation timing

## Deployment Considerations

### 1. **Environment Management**
- **Configuration**: Environment-specific settings
- **Secrets Management**: Secure credential handling
- **Feature Flags**: Runtime feature toggles
- **Health Checks**: Deployment validation

### 2. **Scalability**
- **Horizontal Scaling**: Multiple application instances
- **Load Balancing**: Request distribution
- **Database Sharding**: Data distribution strategy
- **Cache Distribution**: Redis cluster setup

## Best Practices

### 1. **Code Organization**
- **Module Structure**: Logical module boundaries
- **Service Layer**: Business logic separation
- **Repository Pattern**: Data access abstraction
- **DTO Validation**: Input/output validation

### 2. **Error Handling**
- **Global Filters**: Centralized error handling
- **Structured Errors**: Consistent error format
- **Error Logging**: Comprehensive error tracking
- **User Experience**: User-friendly error messages

### 3. **Testing Strategy**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **E2E Tests**: Full application testing
- **Test Coverage**: Minimum coverage requirements

## Future Enhancements

### 1. **Planned Features**
- **GraphQL Support**: Alternative API layer
- **WebSocket Integration**: Real-time communication
- **Microservices**: Service decomposition
- **Kubernetes**: Container orchestration

### 2. **Performance Improvements**
- **Query Optimization**: Advanced database tuning
- **Caching Strategy**: Multi-tier caching
- **Async Processing**: Background job optimization
- **Load Testing**: Performance validation

## Support & Maintenance

### 1. **Documentation**
- **API Documentation**: OpenAPI/Swagger specs
- **Code Comments**: Comprehensive inline documentation
- **Architecture Decisions**: Decision record keeping
- **Troubleshooting**: Common issue resolution

### 2. **Maintenance**
- **Dependency Updates**: Regular security updates
- **Performance Monitoring**: Continuous performance tracking
- **Security Audits**: Regular security reviews
- **Backup Strategy**: Data protection measures
