# 📁 Project Structure Documentation

## 🎯 Overview

This document provides a comprehensive overview of the project structure for the NestJS Social Media Platform. The project follows clean architecture principles with clear separation of concerns and domain-driven design.

## 📋 Table of Contents

1. [Root Structure](#root-structure)
2. [Source Code Structure](#source-code-structure)
3. [Module Organization](#module-organization)
4. [Shared Components](#shared-components)
5. [Configuration Files](#configuration-files)
6. [Documentation](#documentation)

---

## 🏗️ Root Structure

```
nest.js-postgresql/
├── src/                    # Source code
├── docs/                   # Documentation
├── test/                   # Test files
├── migrations/             # Database migrations
├── scripts/                # Utility scripts
├── service/                # Docker services
├── cloudflare/             # Cloudflare configuration
├── client/                 # Frontend client
├── logs/                   # Application logs
├── node_modules/           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker configuration
├── nest-cli.json          # NestJS CLI configuration
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
├── tsconfig.build.json    # TypeScript build configuration
└── yarn.lock              # Dependency lock file
```

---

## 📁 Source Code Structure

### **Core Application Files**

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root application module
├── app.controller.ts      # Root controller
├── app.service.ts         # Root service
└── app.controller.spec.ts # Root controller tests
```

### **Feature Modules**

```
src/
├── articles/              # Content Management System
├── auth/                  # Authentication & Authorization
├── bookmarks/             # Bookmark System
├── comments/              # Comment System
├── follow/                # Follow System (Roaring Bitmap)
├── media/                 # Media Management
├── notifications/         # Notification System
├── qr/                    # QR Actions Feature
├── rate-limit/            # Rate Limiting System
├── reactions/             # Reaction System
├── reports/               # Content Moderation
├── stickers/              # Sticker System
├── tags/                  # Tag System
├── users/                 # User Management
└── workers/               # Background Job Processing
```

### **Shared Components**

```
src/
├── common/                # Shared utilities & cross-cutting concerns
├── shared/                # Shared services & configurations
├── i18n/                  # Internationalization
└── config/                # Configuration files
```

---

## 🏢 Module Organization

### **📁 `src/articles/` - Content Management System**
**Purpose:** Handles article creation, publishing, and management

**Key Features:**
- Rich text editor support (Markdown/HTML)
- Scheduled publishing
- Content status management
- SEO optimization
- Content analytics

### **📁 `src/auth/` - Authentication & Authorization**
**Purpose:** Handles user authentication and authorization

**Key Features:**
- JWT-based authentication
- OAuth integration (Google, Facebook, GitHub)
- Firebase authentication
- Role-based access control
- Session management

### **📁 `src/bookmarks/` - Bookmark System**
**Purpose:** Manages user bookmarks and saved content

**Key Features:**
- Content bookmarking
- Folder organization
- Tag-based categorization
- Search and filtering
- Privacy controls

### **📁 `src/comments/` - Comment System**
**Purpose:** Handles comments and threaded discussions

**Key Features:**
- Nested comment threading
- Media attachments
- User mentions
- Comment reactions
- Moderation tools

### **📁 `src/follow/` - Follow System (Roaring Bitmap)**
**Purpose:** High-performance follow/unfollow system using roaring bitmap

**Key Features:**
- Roaring bitmap implementation
- High-performance follow operations
- Follow suggestions
- News feed generation
- Background processing

### **📁 `src/media/` - Media Management**
**Purpose:** Handles file upload, storage, and media management

**Key Features:**
- Multiple file type support
- Image processing and optimization
- Cloud storage integration (AWS S3, R2)
- CDN integration
- Metadata management

### **📁 `src/notifications/` - Notification System**
**Purpose:** Comprehensive notification system with multiple channels

**Key Features:**
- Multi-channel notifications
- User preference management
- Real-time WebSocket updates
- Broadcast notifications
- Notification templates
- Scheduled notifications

### **📁 `src/qr/` - QR Actions Feature**
**Purpose:** Secure QR code-based actions with PKCE security

**Key Features:**
- PKCE security implementation
- Real-time WebSocket updates
- Pluggable action system
- Redis state management
- Multi-language support

### **📁 `src/rate-limit/` - Rate Limiting System**
**Purpose:** Hybrid rate limiting with plan-based and policy-based approaches

**Key Features:**
- Hybrid rate limiting system
- Multiple strategies (Fixed, Sliding, Token Bucket)
- Policy-based configuration
- Hot reload capabilities
- Admin management interface

### **📁 `src/reactions/` - Reaction System**
**Purpose:** Handles user reactions (like, dislike, bookmark, clap)

**Key Features:**
- Multiple reaction types
- Reaction counting
- Analytics and statistics
- Performance optimization

### **📁 `src/reports/` - Content Moderation**
**Purpose:** Handles content reporting and moderation

**Key Features:**
- Content reporting system
- Moderation tools
- Report categorization
- Audit trail
- Statistics and analytics

### **📁 `src/stickers/` - Sticker System**
**Purpose:** Manages stickers and emoji reactions

**Key Features:**
- Sticker library management
- Sticker categories
- Sticker packs
- Custom sticker uploads

### **📁 `src/tags/` - Tag System**
**Purpose:** Handles content tagging and categorization

**Key Features:**
- Content tagging
- Tag suggestions
- Tag analytics
- Search functionality

### **📁 `src/users/` - User Management**
**Purpose:** Manages user data and user-related operations

**Key Features:**
- User profile management
- Device token management
- Session tracking
- OAuth integration
- User analytics

### **📁 `src/workers/` - Background Job Processing**
**Purpose:** Handles background job processing with RabbitMQ

**Key Features:**
- Background job processing
- RabbitMQ integration
- Error handling and retry
- Job monitoring

---

## 🔧 Shared Components

### **📁 `src/common/` - Shared Utilities**

**Key Components:**
- **Decorators**: Authentication, roles, client info
- **DTOs**: Pagination, validation
- **Filters**: Exception handling
- **Gateways**: WebSocket support
- **Pipes**: Validation pipes
- **Repositories**: Base repository patterns
- **Services**: Base service patterns
- **Subscribers**: TypeORM subscribers
- **Utils**: Utility functions

### **📁 `src/shared/` - Shared Services & Configurations**

**Key Components:**
- **Config**: Application configuration
- **Constants**: Application constants
- **Entities**: Base entities
- **Helpers**: Helper functions
- **Interceptors**: Response interceptors
- **Libs**: External libraries (Snowflake)
- **Services**: Core services (Cache, Mail, Firebase, etc.)

---

## 📋 Configuration Files

### **Root Configuration**
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tsconfig.build.json` - TypeScript build configuration
- `nest-cli.json` - NestJS CLI configuration
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration

### **Docker Configuration**
- `Dockerfile` - Docker container configuration
- `docker-compose.yml` - Docker Compose configuration
- `service/docker-compose.yml` - Infrastructure services

### **Environment Configuration**
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

---

## 📚 Documentation

### **Architecture Documentation**
- `docs/ARCHITECTURE.md` - System architecture
- `docs/PROJECT_OVERVIEW.md` - Project overview
- `docs/PROJECT_STRUCTURE.md` - Project structure (this file)
- `docs/PROJECT_STRUCTURE_EN.md` - English version

### **Feature Documentation**
- `docs/QR_ACTIONS.md` - QR actions feature
- `docs/FIREBASE_AUTHENTICATION.md` - Firebase authentication
- `docs/MAIL_QUEUE_IMPLEMENTATION.md` - Mail queue system
- `docs/R2_INTEGRATION.md` - Cloudflare R2 integration
- `docs/README-SCHEDULED-PUBLISHING.md` - Scheduled publishing
- `docs/README-SLUG.md` - Slug generation

### **Implementation Documentation**
- `docs/IMPLEMENTATION_COMPLETE.md` - Implementation status
- `docs/HYBRID_RATE_LIMITING_IMPLEMENTATION.md` - Rate limiting
- `docs/RATE_LIMIT_IMPLEMENTATION.md` - Rate limiting details

### **Service Documentation**
- `docs/BASE_SERVICE_GUIDE.md` - Base service guide
- `docs/GRAPHQL_BASE_SERVICE_GUIDE.md` - GraphQL service guide
- `docs/RELATIONS_WHITELIST_EXAMPLES.md` - Relations whitelist

### **Database Documentation**
- `docs/DATABASE_NAMING_CONVENTIONS.md` - Database conventions

### **Deployment Documentation**
- `docs/DOCKER_README.md` - Docker setup
- `docs/SECURITY.md` - Security guidelines

---

## 🎯 Key Design Principles

### **1. Domain-Driven Design**
- Each module represents a business domain
- Clear boundaries between modules
- Domain-specific language and concepts

### **2. Clean Architecture**
- Separation of concerns
- Dependency inversion
- Single responsibility principle

### **3. Scalability**
- Horizontal scaling support
- Caching strategies
- Background job processing

### **4. Security**
- Authentication and authorization
- Input validation
- Rate limiting
- Audit logging

### **5. Performance**
- Database optimization
- Caching layers
- Async processing
- CDN integration

---

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `yarn install`
3. **Configure environment**: Copy `.env.example` to `.env`
4. **Start infrastructure**: `cd service && docker-compose up -d`
5. **Run migrations**: `yarn migration:run`
6. **Start application**: `yarn start:dev`

The application will be available at `http://localhost:3000` with full API documentation.

---

**This project structure follows industry best practices and provides a solid foundation for a scalable social media platform.**
