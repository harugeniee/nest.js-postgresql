---
description: Domain-Driven Design (DDD) module architecture and structure.
globs: "**/*"
alwaysApply: true
---
# Module Architecture

## Directory Structure
Standard module layout:
```
module-name/
├── module-name.module.ts       # Wires controller/service/repo
├── module-name.controller.ts   # Thin routes & validation
├── module-name.service.ts      # Business logic (extends BaseService)
├── module-name.repository.ts   # (Optional) Custom queries (extends TypeOrmBaseRepository)
├── entities/
│   └── *.entity.ts             # Database schema (extends BaseEntityCustom)
├── dto/
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── get-*.dto.ts
└── services/                   # Additional specialized services
```

## Module Contract
A domain module includes ONLY:
- **Module File**: Imports `TypeOrmModule.forFeature([Entity])`, `AnalyticsModule`, `PermissionsModule`. Exports mechanisms.
- **Controller**: DTO validation and delegating to service. NO business logic.
- **Service**: Extends `BaseService<T>`. Defines configuration (cache, search, whitelists).
- **Entities**: Extend `BaseEntityCustom` with explicit table names.

### Anti-Patterns
- Direct DB access from controller.
- `process.env` usage inside feature modules (use centralized config services).
- Business logic in controllers.
- Raw SQL queries without proper parameterization.
- Missing input validation on DTOs.

### Example Module Definition
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    AnalyticsModule,      // Required for @TrackEvent support
    PermissionsModule,    // Required for @RequirePermissions support
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, ScheduledPublishingService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
```
