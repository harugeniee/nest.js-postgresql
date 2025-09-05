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
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── common/              # Shared utilities & cross-cutting concerns
│   ├── decorators/     # Custom decorators
│   ├── dto/            # Data Transfer Objects
│   ├── events/         # Domain events
│   ├── filters/        # Exception filters
│   ├── gateways/       # WebSocket gateways
│   ├── interface/      # Shared interfaces
│   ├── pipes/          # Validation pipes
│   ├── repositories/   # Base repository patterns
│   ├── services/       # Base service patterns
│   ├── subscribers/    # TypeORM subscribers
│   └── utils/          # Utility functions
├── files/              # File management
│   ├── entities/       # File entities
│   ├── files.controller.ts
│   ├── files.service.ts
│   └── files.module.ts
├── i18n/               # Internationalization
│   ├── en/             # English translations
│   └── vi/             # Vietnamese translations
├── qr/                 # QR Actions feature
│   ├── actions/        # Action implementations
│   ├── dto/            # QR DTOs
│   ├── entities/       # QR entities
│   ├── qr.controller.ts
│   ├── qr.gateway.ts
│   ├── qr.service.ts
│   └── qr.module.ts
├── shared/             # Shared services & configurations
│   ├── config/         # Environment configuration
│   ├── constants/      # Application constants
│   ├── entities/       # Base entities
│   ├── helpers/        # Helper functions
│   ├── interceptors/   # Response interceptors
│   ├── libs/           # External library integrations
│   └── services/       # Core services (Cache, RabbitMQ, Firebase, etc.)
├── users/              # User management
│   ├── dto/            # User DTOs
│   ├── entities/       # User entities
│   ├── services/       # User services
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
└── workers/            # Background job processing
    ├── worker.controller.ts
    ├── worker.service.ts
    └── worker.module.ts
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

### 6. **WebSocket Support**
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
