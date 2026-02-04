# Claude Code Skills

Custom skills for the nest.js-postgresql project to streamline development.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Generate Module | `/generate-module {name}` | Create complete NestJS module (entity, service, controller, DTOs, module) |
| Generate Entity | `/generate-entity {name}` | Create TypeORM entity with relations |
| Generate DTO | `/generate-dto {name}` | Create DTOs with class-validator decorators |
| Add Service Method | `/add-service-method {service} {method}` | Add method to existing service |
| Add Endpoint | `/add-endpoint {controller} {action}` | Add API endpoint to controller |
| Generate Test | `/generate-test {service/controller}` | Generate unit tests |
| Generate Constants | `/generate-constants {module}` | Create constants file |
| Validate Code | `/validate-code [path]` | Check code against CLAUDE.md rules |

## Quick Start

### Create a new feature module
```
/generate-module user-profiles
```
This creates:
- `src/user-profiles/entities/user-profile.entity.ts`
- `src/user-profiles/user-profiles.service.ts`
- `src/user-profiles/user-profiles.controller.ts`
- `src/user-profiles/dto/create-user-profile.dto.ts`
- `src/user-profiles/dto/update-user-profile.dto.ts`
- `src/user-profiles/dto/get-user-profile.dto.ts`
- `src/user-profiles/user-profiles.module.ts`

### Add a custom endpoint
```
/add-endpoint ArticlesController publish
```

### Generate tests for a service
```
/generate-test ArticlesService
```

### Validate before PR
```
/validate-code src/articles
```

## Project Conventions

All skills follow the patterns defined in:
- `CLAUDE.md` - Main project rules
- `.cursor/rules/` - Cursor IDE rules
- `.agent/rules/` - Agent Framework rules

### Key Patterns
- **Entities**: Extend `BaseEntityCustom`, use camelCase for columns
- **Services**: Extend `BaseService<T>`, configure cache and whitelists
- **Controllers**: Thin delegators with `@Auth()`, `@TrackEvent()`, `SnowflakeIdPipe`
- **DTOs**: Use `class-validator` decorators, extend pagination DTOs
- **Errors**: Use i18n message keys `{ messageKey: 'domain.ERROR_KEY' }`

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| File names | kebab-case | `user-profile.entity.ts` |
| Classes | PascalCase | `UserProfilesService` |
| Table names | plural snake_case | `user_profiles` |
| Properties | camelCase | `userId`, `createdAt` |
| Constants | UPPER_SNAKE_CASE | `USER_CONSTANTS` |

## Guardrails

These skills respect project guardrails:
- **No migrations** - TypeORM synchronize is enabled
- **No generators** - `nest g` is prohibited
- **Yarn only** - No npm/pnpm commands

## Directory Structure

```
.claude/
├── README.md              # This file
└── skills/
    ├── generate-module.md
    ├── generate-entity.md
    ├── generate-dto.md
    ├── add-service-method.md
    ├── add-endpoint.md
    ├── generate-test.md
    ├── generate-constants.md
    └── validate-code.md
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project rules and patterns
- [.cursor/rules/](../.cursor/rules/) - Cursor IDE rules
- [.agent/rules/](../.agent/rules/) - Agent Framework rules
- [docs/BASE_SERVICE_GUIDE.md](../docs/BASE_SERVICE_GUIDE.md) - BaseService usage
