---
description: General principles and strict guardrails for the project.
globs: "**/*"
alwaysApply: true
---
# General Principles & Guardrails

## Core Philosophy
> **No migrations. No generators. Yarn only.**

This project follows strict engineering standards to ensure maintainability and consistency.

### MUST
- Develop within existing domain modules (`analytics`, `articles`, `auth`, `authors`, `badges`, `bookmarks`, `characters`, `comments`, `contributions`, `follow`, `key-value`, `media`, `notifications`, `organizations`, `permissions`, `qr`, `rate-limit`, `reactions`, `reports`, `series`, `share`, `staffs`, `stickers`, `studios`, `tags`, `users`, `workers`).
- Keep controllers thin: validation + routing only; delegate ALL business logic to services.
- Use **Yarn exclusively** (`yarn add`, `yarn remove`, `yarn install`).
- Follow patterns established in `src/`, `src/shared/`, `src/common/`.

### MUST NOT
- Run generators (`nest g`, codegen) or migrations (`yarn migration:generate`, `yarn migration:run`).
- Use npm/pnpm for package management.
- Access `process.env` directly in feature modules (use ConfigService).

## Guardrails

### Migrations & Codegen
- If a solution requires DB migration or codegen, RESPOND with:
  "Decline: Migrations and generators are out of scope. Adjust only entities/services per rules."
- NEVER run `yarn migration:generate`, `yarn migration:run`, `nest g`, or similar commands.

### Package Management
- If a command uses npm/pnpm, REWRITE to Yarn.
- Only use: `yarn add`, `yarn remove`, `yarn install`, `yarn upgrade`.

### Controller Boundaries
- If a controller contains business logic (>5 lines of domain logic), MOVE it to service.
- Controllers MUST be thin delegators.

### Configuration Access
- If accessing process.env directly in feature modules, USE ConfigService instead.
