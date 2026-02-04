---
description: Authentication, authorization, guards, and decorators.
globs: "**/*"
alwaysApply: true
---
# Security

## Authentication & Authorization

### Guards
| Guard | Purpose |
|-------|---------|
| `JwtAccessTokenGuard` | JWT access token validation |
| `JwtRefreshTokenGuard` | JWT refresh token validation |
| `RolesGuard` | Role-based access |
| `PermissionsGuard` | Permission-based access |
| `OptionalAuthGuard` | Optional authentication |
| `WebSocketAuthGuard` | WebSocket auth |

### Usage Patterns
```typescript
@Auth()                              // Requires authentication
@Auth(['admin', 'moderator'])        // Requires specific roles
@Auth(undefined, true)               // Optional authentication
@RequirePermissions({ all: ['article.update'] })  // Permission check
```

## Module Imports
Feature modules must import `PermissionsModule` to use `@RequirePermissions`.
