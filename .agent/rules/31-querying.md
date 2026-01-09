---
description: Query building, filtering, and searching helpers.
globs: "**/*"
alwaysApply: true
---
# Query Building

## ConditionBuilder
### MUST
- Use `ConditionBuilder` from `src/shared/helpers/condition-builder.ts`.
- Never concatenate SQL strings manually.

### Capabilities
- Status filtering (`In`, `Not`)
- ID/user filtering
- Date ranges (`Between`, `MoreThanOrEqual`, `LessThanOrEqual`)
- Search (`ILike`, `Like`, JSONB)

### Example Usage
```typescript
const where = ConditionBuilder.build(
  { 
    query: q.keyword, 
    fields: q.fields, 
    caseSensitive: 0, 
    fromDate: q.from, 
    toDate: q.to,
    status: q.status,
    userId: q.userId 
  },
  'title',         // default search field
  { is_active: true } // extra filters
);
return this.repo.findAndCount({ where });
```

## Search Validation
- Prefer ILIKE for keyword search.
- Validate requested fields against `getSearchableColumns()`.
- BaseService automatically validates fields against the whitelist.
