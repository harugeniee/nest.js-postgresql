---
name: generate-constants
description: Generate constants file for a module following project patterns
user_invocable: true
---

# Generate Constants

Generate a constants file for a module following the project's established patterns.

## Instructions

When the user invokes this skill (e.g., `/generate-constants articles`), generate a constants file.

## Constants File Template

Location: `src/shared/constants/{module}.constants.ts`

```typescript
/**
 * Constants for the {Module} module
 *
 * Contains status enums, configuration values, and module-specific constants
 */

// Status enum
export const {MODULE}_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SCHEDULED: 'scheduled',
} as const;

export type {Module}Status = (typeof {MODULE}_STATUS)[keyof typeof {MODULE}_STATUS];

// Visibility enum
export const {MODULE}_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
} as const;

export type {Module}Visibility = (typeof {MODULE}_VISIBILITY)[keyof typeof {MODULE}_VISIBILITY];

// Content format enum
export const {MODULE}_CONTENT_FORMAT = {
  MARKDOWN: 'markdown',
  HTML: 'html',
  PLAIN: 'plain',
} as const;

export type {Module}ContentFormat = (typeof {MODULE}_CONTENT_FORMAT)[keyof typeof {MODULE}_CONTENT_FORMAT];

// Validation constraints
export const {MODULE}_CONSTANTS = {
  // Status values
  STATUS: {MODULE}_STATUS,
  VISIBILITY: {MODULE}_VISIBILITY,
  CONTENT_FORMAT: {MODULE}_CONTENT_FORMAT,

  // Length constraints
  TITLE_MAX_LENGTH: 256,
  TITLE_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 300,
  SUMMARY_MAX_LENGTH: 500,
  CONTENT_MAX_LENGTH: 100000,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Cache TTL (seconds)
  CACHE_TTL: 60,
  CACHE_SWR: 30,

  // Business rules
  MAX_TAGS: 10,
  MAX_AUTHORS: 5,

  // Scheduled publishing
  MIN_SCHEDULE_AHEAD_MINUTES: 5,
  MAX_SCHEDULE_AHEAD_DAYS: 365,
} as const;

// Error message keys (for i18n)
export const {MODULE}_ERRORS = {
  NOT_FOUND: '{module}.NOT_FOUND',
  ALREADY_EXISTS: '{module}.ALREADY_EXISTS',
  FORBIDDEN: '{module}.FORBIDDEN',
  INVALID_STATUS: '{module}.INVALID_STATUS',
  INVALID_TRANSITION: '{module}.INVALID_STATUS_TRANSITION',
  LIMIT_EXCEEDED: '{module}.LIMIT_EXCEEDED',
  INVALID_SCHEDULE: '{module}.INVALID_SCHEDULE_DATE',
} as const;
```

## Export from Index

Add to `src/shared/constants/index.ts`:

```typescript
export * from './{module}.constants';
```

## Usage Examples

### In Entity
```typescript
import { {MODULE}_CONSTANTS, {Module}Status } from 'src/shared/constants';

@Column({
  type: 'enum',
  enum: {MODULE}_CONSTANTS.STATUS,
  default: {MODULE}_CONSTANTS.STATUS.DRAFT,
})
status: {Module}Status;

@Column({ type: 'varchar', length: {MODULE}_CONSTANTS.TITLE_MAX_LENGTH })
title: string;
```

### In Service
```typescript
import { {MODULE}_CONSTANTS, {MODULE}_ERRORS } from 'src/shared/constants';

if (entity.status !== {MODULE}_CONSTANTS.STATUS.DRAFT) {
  throw new HttpException(
    { messageKey: {MODULE}_ERRORS.INVALID_TRANSITION },
    HttpStatus.BAD_REQUEST,
  );
}
```

### In DTO
```typescript
import { {MODULE}_CONSTANTS } from 'src/shared/constants';

@MaxLength({MODULE}_CONSTANTS.TITLE_MAX_LENGTH)
@MinLength({MODULE}_CONSTANTS.TITLE_MIN_LENGTH)
title: string;

@ArrayMaxSize({MODULE}_CONSTANTS.MAX_TAGS)
tags?: string[];
```

## Analytics Constants

For tracking events, add to `src/shared/constants/analytics.constants.ts`:

```typescript
export const ANALYTICS_CONSTANTS = {
  // ... existing constants

  EVENT_TYPES: {
    // ... existing types
    {MODULE}_CREATE: '{module}_create',
    {MODULE}_UPDATE: '{module}_update',
    {MODULE}_DELETE: '{module}_delete',
    {MODULE}_VIEW: '{module}_view',
    {MODULE}_PUBLISH: '{module}_publish',
  },

  SUBJECT_TYPES: {
    // ... existing types
    {MODULE}: '{module}',
  },
};
```

## Common Patterns

### Status Transitions
```typescript
export const {MODULE}_STATUS_TRANSITIONS: Record<{Module}Status, {Module}Status[]> = {
  [STATUS.DRAFT]: [STATUS.PUBLISHED, STATUS.SCHEDULED, STATUS.ARCHIVED],
  [STATUS.SCHEDULED]: [STATUS.DRAFT, STATUS.PUBLISHED, STATUS.ARCHIVED],
  [STATUS.PUBLISHED]: [STATUS.ARCHIVED],
  [STATUS.ARCHIVED]: [STATUS.DRAFT],
};

// Helper function
export function canTransition(from: {Module}Status, to: {Module}Status): boolean {
  return {MODULE}_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### Role-based Permissions
```typescript
export const {MODULE}_PERMISSIONS = {
  CREATE: '{module}.create',
  READ: '{module}.read',
  UPDATE: '{module}.update',
  DELETE: '{module}.delete',
  PUBLISH: '{module}.publish',
  ADMIN: '{module}.admin',
} as const;
```

## File Structure
```
src/shared/constants/
├── index.ts              # Barrel export
├── common.constants.ts   # Shared constants
├── analytics.constants.ts
├── article.constants.ts
├── user.constants.ts
├── {module}.constants.ts # New module constants
└── ...
```

## Important Notes
- Use `as const` for type inference
- Export types alongside constants
- Use UPPER_SNAKE_CASE for constant objects
- Add to index.ts for easy imports
- Keep error keys consistent with i18n translations
- Document business rules in comments
