---
name: generate-module
description: Generate a new NestJS module following project patterns (entity, service, controller, DTOs, module)
user_invocable: true
---

# Generate NestJS Module

Generate a complete NestJS module following the project's established patterns from CLAUDE.md.

## Instructions

When the user invokes this skill with a module name (e.g., `/generate-module posts`), generate all required files:

### 1. Entity (`src/{module}/entities/{module}.entity.ts`)
```typescript
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: '{table_name}' }) // plural snake_case
@Index(['createdAt'])
export class {EntityName} extends BaseEntityCustom {
  // Add columns with camelCase properties
  // Example:
  // @Column({ type: 'bigint', nullable: false })
  // userId: string;
}
```

### 2. Service (`src/{module}/{module}.service.ts`)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { {EntityName} } from './entities/{module}.entity';

@Injectable()
export class {ServiceName} extends BaseService<{EntityName}> {
  private readonly logger = new Logger({ServiceName}.name);

  constructor(
    @InjectRepository({EntityName}) repo: Repository<{EntityName}>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<{EntityName}>(repo),
      {
        entityName: '{EntityName}',
        cache: { enabled: true, ttlSec: 60, prefix: '{module}', swrSec: 30 },
        defaultSearchField: 'name',
        relationsWhitelist: {},
        selectWhitelist: { id: true },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof {EntityName})[] {
    return ['id'];
  }
}
```

### 3. Controller (`src/{module}/{module}.controller.ts`)
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseInterceptors } from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { TrackEvent } from 'src/analytics/decorators';
import { AnalyticsInterceptor } from 'src/analytics/interceptors';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants';
import { {ServiceName} } from './{module}.service';
import { Create{EntityName}Dto } from './dto/create-{module}.dto';
import { Update{EntityName}Dto } from './dto/update-{module}.dto';
import { Get{EntityName}Dto } from './dto/get-{module}.dto';

@Controller('{module}')
@UseInterceptors(AnalyticsInterceptor)
export class {ControllerName} {
  constructor(private readonly {serviceName}: {ServiceName}) {}

  @Post()
  @Auth()
  create(@Body() dto: Create{EntityName}Dto, @Request() req) {
    return this.{serviceName}.create({ ...dto, userId: req.user.uid });
  }

  @Get()
  @Auth(undefined, true)
  findAll(@Query() query: Get{EntityName}Dto) {
    return this.{serviceName}.listCursor(query);
  }

  @Get(':id')
  @Auth(undefined, true)
  findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.{serviceName}.findById(id);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', SnowflakeIdPipe) id: string, @Body() dto: Update{EntityName}Dto) {
    return this.{serviceName}.update(id, dto);
  }

  @Delete(':id')
  @Auth()
  remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.{serviceName}.softDelete(id);
  }
}
```

### 4. DTOs (`src/{module}/dto/`)

**create-{module}.dto.ts:**
```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class Create{EntityName}Dto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  name: string;
}
```

**update-{module}.dto.ts:**
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { Create{EntityName}Dto } from './create-{module}.dto';

export class Update{EntityName}Dto extends PartialType(Create{EntityName}Dto) {}
```

**get-{module}.dto.ts:**
```typescript
import { CursorPaginationDto } from 'src/common/dto';

export class Get{EntityName}Dto extends CursorPaginationDto {}
```

### 5. Module (`src/{module}/{module}.module.ts`)
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { {EntityName} } from './entities/{module}.entity';
import { {ServiceName} } from './{module}.service';
import { {ControllerName} } from './{module}.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([{EntityName}]),
    AnalyticsModule,
    PermissionsModule,
  ],
  controllers: [{ControllerName}],
  providers: [{ServiceName}],
  exports: [{ServiceName}],
})
export class {ModuleName} {}
```

## Naming Conventions
- Module name: kebab-case (e.g., `user-profiles`)
- Table name: plural snake_case (e.g., `user_profiles`)
- Entity: PascalCase (e.g., `UserProfile`)
- Service: PascalCase + Service (e.g., `UserProfilesService`)
- Controller: PascalCase + Controller (e.g., `UserProfilesController`)

## Important Notes
- DO NOT run `nest g` or any generators - create files manually
- Always extend `BaseEntityCustom` for entities
- Always extend `BaseService<T>` for services
- Keep controllers thin - all business logic in services
- Use `SnowflakeIdPipe` for ID parameters
- Configure cache with unique prefix per module
