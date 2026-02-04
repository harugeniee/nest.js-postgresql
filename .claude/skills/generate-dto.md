---
name: generate-dto
description: Generate DTOs with class-validator decorators for NestJS endpoints
user_invocable: true
---

# Generate DTO

Generate Data Transfer Objects with proper validation using class-validator.

## Instructions

When the user invokes this skill (e.g., `/generate-dto CreateArticle`), generate DTOs with validation.

## Create DTO Template

```typescript
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDate,
  IsUUID,
  IsEmail,
  IsUrl,
  MaxLength,
  MinLength,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class Create{EntityName}Dto {
  // Required string with max length
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  title: string;

  // Optional string
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Enum field
  @IsOptional()
  @IsEnum(STATUS_ENUM)
  status?: StatusType;

  // Number with range
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  // Boolean
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublished?: boolean;

  // Array of strings
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  // Array of Snowflake IDs
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  authorIds?: string[];

  // Nested object
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;

  // Date field
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledAt?: Date;
}
```

## Update DTO Template

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { Create{EntityName}Dto } from './create-{module}.dto';

export class Update{EntityName}Dto extends PartialType(Create{EntityName}Dto) {
  // Add update-specific fields here if needed
}
```

## Get/Query DTO Template (Cursor Pagination)

```typescript
import { IsOptional, IsString, IsEnum, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CursorPaginationDto } from 'src/common/dto';

export class Get{EntityName}Dto extends CursorPaginationDto {
  // Search query
  @IsOptional()
  @IsString()
  query?: string;

  // Status filter
  @IsOptional()
  @IsEnum(STATUS_ENUM)
  status?: StatusType;

  // User filter
  @IsOptional()
  @IsString()
  userId?: string;

  // Date range filters
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  // Boolean filter
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublished?: boolean;
}
```

## Get/Query DTO Template (Offset Pagination)

```typescript
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AdvancedPaginationDto } from 'src/common/dto';

export class Get{EntityName}OffsetDto extends AdvancedPaginationDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(STATUS_ENUM)
  status?: StatusType;
}
```

## Common Validators

### String Validators
```typescript
@IsString()                    // Must be string
@IsNotEmpty()                  // Cannot be empty
@MaxLength(256)                // Max 256 characters
@MinLength(3)                  // Min 3 characters
@Matches(/^[a-z0-9-]+$/)       // Regex pattern (slug)
```

### Number Validators
```typescript
@IsNumber()                    // Must be number
@IsInt()                       // Must be integer
@Min(0)                        // Minimum value
@Max(100)                      // Maximum value
@IsPositive()                  // Must be positive
```

### Boolean Validators
```typescript
@IsBoolean()
@Transform(({ value }) => value === 'true' || value === true)
```

### Array Validators
```typescript
@IsArray()                     // Must be array
@ArrayMaxSize(10)              // Max 10 items
@ArrayMinSize(1)               // Min 1 item
@IsString({ each: true })      // Each item is string
@IsNumber({}, { each: true })  // Each item is number
```

### Date Validators
```typescript
@IsDate()
@Type(() => Date)              // Transform to Date object
@MinDate(new Date())           // Must be in future
```

### Special Validators
```typescript
@IsEmail()                     // Valid email
@IsUrl()                       // Valid URL
@IsUUID()                      // Valid UUID
@IsEnum(MyEnum)                // Must be enum value
@IsOptional()                  // Field is optional
```

### Custom Transform Examples
```typescript
// Trim whitespace
@Transform(({ value }) => value?.trim())
@IsString()
title: string;

// Parse comma-separated to array
@Transform(({ value }) =>
  typeof value === 'string' ? value.split(',').map(s => s.trim()) : value
)
@IsArray()
tags: string[];

// Default value
@Transform(({ value }) => value ?? 'draft')
@IsEnum(STATUS)
status: Status;

// Sanitize HTML
@Transform(({ value }) => sanitizeHtml(value))
@IsString()
content: string;
```

## Pagination DTO Reference

### CursorPaginationDto (from src/common/dto)
```typescript
// Already includes:
// - take (1-100, default 20)
// - cursor (optional)
// - sortBy (optional)
// - order ('ASC' | 'DESC')
```

### AdvancedPaginationDto (from src/common/dto)
```typescript
// Already includes:
// - page (min 1)
// - limit (1-100)
// - sortBy
// - order
```

## File Structure
```
src/{module}/dto/
├── create-{module}.dto.ts
├── update-{module}.dto.ts
├── get-{module}.dto.ts
└── index.ts (optional barrel export)
```

## Important Notes
- Always use class-validator decorators
- Use `@Type()` for nested objects and dates
- Use `@Transform()` for custom transformations
- Clamp pagination `limit` to 1..100
- Export DTOs from module or barrel file
- Use `PartialType` for Update DTOs to inherit validation
