---
description: Testing strategies and best practices.
globs: "**/*"
alwaysApply: true
---
# Testing

## Strategy
| Type | Location | Command |
|------|----------|---------|
| Unit | `*.spec.ts` beside source | `yarn test` |
| E2E | `test/*.e2e-spec.ts` | `yarn test:e2e` |

## Best Practices
- Mock external dependencies (DB, cache, HTTP).
- Use `@nestjs/testing` utilities.
- Focus on business logic, not infrastructure.
