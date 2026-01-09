---
description: Development workflow and acceptance checklist.
globs: "**/*"
alwaysApply: true
---
# Development Workflow

## Adding a Feature
1. Create entity extending `BaseEntityCustom` with explicit `@Entity('table_name')`.
2. Create DTOs with class-validator decorators.
3. Create service extending `BaseService` with whitelists and cache config.
4. Create thin controller with `@Auth()`, `@TrackEvent()`, `SnowflakeIdPipe`.
5. Register in module with required imports.
6. Write tests for business logic.

## Acceptance Checklist

### Entity
- [ ] Extends `BaseEntityCustom`.
- [ ] Table name is plural snake_case.
- [ ] Column names use snake_case.

### Service
- [ ] Extends `BaseService`.
- [ ] Cache, relations whitelist, select whitelist configured.
- [ ] `getSearchableColumns()` defined.

### Controller
- [ ] Thin delegator.
- [ ] `@Auth`, `@TrackEvent`, `SnowflakeIdPipe` used.

### General
- [ ] No migrations or generators used.
- [ ] Yarn only.
- [ ] No hardcoded secrets.
