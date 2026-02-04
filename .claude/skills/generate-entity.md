---
name: generate-entity
description: Generate a TypeORM entity with relations following project naming conventions
user_invocable: true
---

# Generate Entity

Generate a TypeORM entity following the project's established patterns from CLAUDE.md.

## Instructions

When the user invokes this skill (e.g., `/generate-entity Comment --relations user:ManyToOne article:ManyToOne`), create an entity file.

### Entity Template

```typescript
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToOne,
  ManyToMany,
  OneToMany,
} from 'typeorm';

/**
 * {EntityName} entity
 *
 * Description of what this entity represents
 */
@Entity({ name: '{table_name}' })
@Index(['{indexedField}', 'createdAt'])
export class {EntityName} extends BaseEntityCustom {
  // Foreign key column (for ManyToOne relations)
  @Column({ type: 'bigint', nullable: false })
  userId: string;

  // ManyToOne relation - JoinColumn uses camelCase
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  // Regular columns
  @Index()
  @Column({ type: 'varchar', length: 256, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'int', default: 0, nullable: false })
  viewsCount: number;

  // Boolean columns - prefix with is/has/can
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  // Timestamp columns - suffix with At
  @Index()
  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // ManyToMany relation - JoinTable uses snake_case
  @ManyToMany(() => Tag, (tag) => tag.{entities}, { cascade: false, eager: false })
  @JoinTable({
    name: '{entity}_tags',
    joinColumn: { name: '{entity}_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: Tag[];

  // OneToMany relation (inverse side)
  @OneToMany(() => Comment, (comment) => comment.{entity}, { cascade: false, eager: false })
  comments?: Comment[];
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Table name | plural snake_case | `user_profiles`, `article_tags` |
| Properties | camelCase | `userId`, `createdAt` |
| Booleans | prefix `is`, `has`, `can` | `isActive`, `hasChildren` |
| Timestamps | suffix `At` | `publishedAt`, `scheduledAt` |
| Foreign keys | `<parent>Id` | `userId`, `articleId` |
| JoinColumn name | camelCase | `{ name: 'userId' }` |
| JoinTable (M2M) | snake_case | table: `article_tags`, columns: `article_id` |

## Column Types Reference

```typescript
// Strings
@Column({ type: 'varchar', length: 256 })
title: string;

@Column({ type: 'text' })
content: string;

// Numbers
@Column({ type: 'bigint' })
userId: string; // Snowflake IDs stored as string

@Column({ type: 'int', default: 0 })
count: number;

@Column({ type: 'decimal', precision: 10, scale: 2 })
price: number;

// Boolean
@Column({ type: 'boolean', default: false })
isActive: boolean;

// Timestamps
@Column({ type: 'timestamp', nullable: true })
publishedAt?: Date;

// JSON
@Column({ type: 'json', nullable: true })
metadata?: Record<string, unknown>;

// Enum
@Column({ type: 'enum', enum: STATUS_ENUM, default: STATUS_ENUM.DRAFT })
status: StatusType;
```

## Relation Types

### ManyToOne (e.g., Comment belongs to User)
```typescript
@Column({ type: 'bigint', nullable: false })
userId: string;

@ManyToOne(() => User, { nullable: false })
@JoinColumn({ name: 'userId', referencedColumnName: 'id' })
user: User;
```

### OneToMany (inverse side - e.g., User has many Comments)
```typescript
@OneToMany(() => Comment, (comment) => comment.user, { cascade: false, eager: false })
comments?: Comment[];
```

### ManyToMany (e.g., Article has many Tags)
```typescript
@ManyToMany(() => Tag, (tag) => tag.articles, { cascade: false, eager: false })
@JoinTable({
  name: 'article_tags',
  joinColumn: { name: 'article_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
})
tags?: Tag[];
```

## Index Guidelines

```typescript
// Single column index
@Index()
@Column({ type: 'varchar' })
slug: string;

// Unique index
@Index({ unique: true })
@Column({ type: 'varchar' })
email: string;

// Composite index (at class level)
@Entity({ name: 'articles' })
@Index(['userId', 'createdAt'])
@Index(['status', 'visibility'])
export class Article extends BaseEntityCustom {}
```

## Important Notes
- Always extend `BaseEntityCustom` - it provides `id`, `uuid`, `createdAt`, `updatedAt`, `deletedAt`, `version`
- Use explicit table name with `@Entity({ name: 'table_name' })`
- DO NOT run migrations - TypeORM synchronize is enabled
- Add proper indexes for frequently queried fields
- Use nullable: true/false explicitly for clarity
