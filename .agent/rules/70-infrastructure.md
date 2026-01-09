---
description: Logging, async processing, and configuration.
globs: "**/*"
alwaysApply: true
---
# Infrastructure

## Logging
- **MUST** use `private readonly logger = new Logger(ClassName.name)`.
- Log IDs, operation names, timing.
- **NEVER** log passwords, tokens, or secrets.

## Async Processing
### RabbitMQ
- **SHOULD** use for heavy async processing (notifications, analytics, media).
- Define queue interfaces in `src/*/interfaces/*-queue.interface.ts`.

### EventEmitter
- **MAY** be used for simple, in-process domain events.
- Acceptable for side effects not requiring persistence/retry.

## Configuration
- Centralized in `src/shared/config/` via `@nestjs/config`.
- Access via `ConfigService`, never `process.env` directly.
