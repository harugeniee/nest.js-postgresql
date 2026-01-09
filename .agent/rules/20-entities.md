---
description: Entity definitions, database schema, and naming conventions.
globs: "**/*.entity.ts"
alwaysApply: true
---
# Entities

## Core Requirements
### MUST
- Extend `BaseEntityCustom` from `src/shared/entities/base.entity.ts`.
- Use explicit table names: `@Entity('table_name')` (plural snake_case).
- TypeScript properties use camelCase (`userId`), database columns use snake_case via `@Column({ name: 'user_id' })`.

## Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Table names | plural snake_case | `users`, `qr_tickets` |
| Columns | snake_case | `user_id`, `created_at` |
| Booleans | prefix `is_`, `has_`, `can_` | `is_active` |
| Timestamps | suffix `_at` | `published_at` |
| Foreign keys | `<parent>_id` | `user_id` |

## BaseEntityCustom Functionality
Provides:
- `id` (Snowflake bigint), `uuid`, `createdAt`, `updatedAt`, `deletedAt`, `version`
- Methods: `toJSON()`, `isDeleted()`, `getAge()`, `getTimeSinceUpdate()`

## Example
```typescript
@Entity('articles')
@Index(['userId', 'createdAt'])
export class Article extends BaseEntityCustom {
  @Column({ type: 'bigint', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;
}
```
