---
description: Entity definitions, database schema, and naming conventions.
globs: "**/*.entity.ts"
alwaysApply: true
---
# Entities

## Core Requirements
### MUST
- Extend `BaseEntityCustom` from `src/shared/entities/base.entity.ts`.
- Use explicit table names: `@Entity('table_name')` or `@Entity({ name: 'table_name' })` (plural snake_case).
- TypeScript properties and database columns both use camelCase (no naming strategy configured).

## Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Table names | plural snake_case | `users`, `articles`, `qr_tickets` |
| Properties/Columns | camelCase | `userId`, `createdAt`, `coverImageId` |
| Booleans | prefix `is`, `has`, `can` | `isActive`, `isEmailVerified` |
| Timestamps | suffix `At` | `publishedAt`, `scheduledAt` |
| Foreign keys (property) | `<parent>Id` | `userId`, `organizationId` |
| JoinColumn name | camelCase | `{ name: 'userId' }` |
| JoinTable (M2M) | snake_case | table: `article_tags`, columns: `article_id`, `tag_id` |

## BaseEntityCustom Functionality
Provides:
- `id` (Snowflake bigint), `uuid`, `createdAt`, `updatedAt`, `deletedAt`, `version`
- Methods: `toJSON()`, `isDeleted()`, `getAge()`, `getTimeSinceUpdate()`

## Example
```typescript
@Entity({ name: 'articles' })
@Index(['userId', 'createdAt'])
export class Article extends BaseEntityCustom {
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  // Many-to-many uses snake_case for join table
  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'article_tags',
    joinColumn: { name: 'article_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: Tag[];
}
```
