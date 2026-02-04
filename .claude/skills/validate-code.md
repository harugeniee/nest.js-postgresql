---
name: validate-code
description: Validate code against CLAUDE.md rules and project patterns
user_invocable: true
---

# Validate Code

Validate code changes against the project's established rules from CLAUDE.md.

## Instructions

When the user invokes this skill (e.g., `/validate-code` or `/validate-code src/articles`), check for violations.

## Validation Checklist

### Entity Validation
- [ ] Extends `BaseEntityCustom`
- [ ] Has explicit `@Entity({ name: 'table_name' })` with plural snake_case
- [ ] Properties use camelCase (not snake_case)
- [ ] JoinColumn uses camelCase names
- [ ] JoinTable (M2M) uses snake_case for table and columns
- [ ] Boolean columns prefixed with `is`, `has`, `can`
- [ ] Timestamp columns suffixed with `At`
- [ ] Proper indexes defined
- [ ] No direct DB migrations (synchronize is used)

### Service Validation
- [ ] Extends `BaseService<T>`
- [ ] Has unique cache prefix configured
- [ ] `relationsWhitelist` configured
- [ ] `selectWhitelist` configured
- [ ] `getSearchableColumns()` returns appropriate fields
- [ ] Uses `Logger` with class name
- [ ] Complex operations use `runInTransaction()`
- [ ] No direct `process.env` access (use ConfigService)

### Controller Validation
- [ ] Controller is thin (no business logic > 5 lines)
- [ ] `@Auth()` decorator on protected endpoints
- [ ] `@TrackEvent()` on CRUD endpoints
- [ ] `SnowflakeIdPipe` used for ID parameters
- [ ] `@UseInterceptors(AnalyticsInterceptor)` applied
- [ ] All logic delegated to services

### Module Validation
- [ ] `TypeOrmModule.forFeature([Entity])` imported
- [ ] `AnalyticsModule` imported (for @TrackEvent)
- [ ] `PermissionsModule` imported (if using @RequirePermissions)
- [ ] Service exported if needed by other modules

### DTO Validation
- [ ] All DTOs use `class-validator` decorators
- [ ] Pagination `limit` clamped to 1..100
- [ ] Proper `@Transform()` decorators for type conversion

### General Validation
- [ ] No `nest g` or migration commands used
- [ ] All package commands use Yarn
- [ ] No hardcoded secrets
- [ ] Errors use i18n message keys

## Common Violations

### 1. Business Logic in Controller
```typescript
// BAD
@Post()
async create(@Body() dto) {
  const slug = dto.title.toLowerCase().replace(/ /g, '-');
  const existing = await this.repo.findOne({ where: { slug } });
  if (existing) throw new Error('Slug exists');
  // ... more logic
}

// GOOD
@Post()
create(@Body() dto) {
  return this.service.create(dto);
}
```

### 2. Direct process.env Access
```typescript
// BAD
const secret = process.env.JWT_SECRET;

// GOOD
constructor(private configService: ConfigService) {}
const secret = this.configService.get('jwt.secret');
```

### 3. Wrong Naming Convention
```typescript
// BAD - snake_case in JoinColumn
@JoinColumn({ name: 'user_id' })

// GOOD - camelCase in JoinColumn
@JoinColumn({ name: 'userId' })

// BAD - camelCase in JoinTable
@JoinTable({ name: 'articleTags' })

// GOOD - snake_case in JoinTable
@JoinTable({ name: 'article_tags' })
```

### 4. Missing Cache Configuration
```typescript
// BAD - no cache prefix
super(repo, { entityName: 'Article' }, cacheService);

// GOOD - unique cache prefix
super(repo, {
  entityName: 'Article',
  cache: { enabled: true, ttlSec: 60, prefix: 'articles', swrSec: 30 },
}, cacheService);
```

### 5. Missing Error i18n Key
```typescript
// BAD
throw new HttpException('Article not found', HttpStatus.NOT_FOUND);

// GOOD
throw new HttpException(
  { messageKey: 'article.NOT_FOUND' },
  HttpStatus.NOT_FOUND,
);
```

### 6. Raw SQL Without Parameterization
```typescript
// BAD
const result = await this.repo.query(`SELECT * FROM users WHERE id = ${id}`);

// GOOD - use ConditionBuilder or TypeORM methods
const result = await this.repo.findOne({ where: { id } });
```

### 7. Missing SnowflakeIdPipe
```typescript
// BAD
@Get(':id')
findOne(@Param('id') id: string) {}

// GOOD
@Get(':id')
findOne(@Param('id', SnowflakeIdPipe) id: string) {}
```

## Validation Output Format

```
## Validation Results for {path}

### Errors (Must Fix)
- [Entity] Missing BaseEntityCustom extension in {file}
- [Controller] Business logic detected in {method} ({lines} lines)

### Warnings (Should Fix)
- [Service] Missing selectWhitelist configuration
- [Controller] @TrackEvent missing on POST endpoint

### Info
- [Module] Consider adding AnalyticsModule import for tracking

### Summary
- Errors: X
- Warnings: Y
- Files checked: Z
```

## Important Notes
- Run validation before creating PRs
- Fix all Errors before committing
- Address Warnings when possible
- See `.cursor/rules/07-checklist.mdc` for full checklist
