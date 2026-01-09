---
description: Service layer patterns, BaseService usage, and transaction management.
globs: "**/*.service.ts"
alwaysApply: true
---
# Services

## Core Requirements
### MUST
- Extend `BaseService<T>` from `src/common/services/base.service.ts`.
- Configure: `entityName`, `cache`, `defaultSearchField`, `relationsWhitelist`, `selectWhitelist`.
- Override `getSearchableColumns()` to define searchable fields.

## BaseService Capabilities
- **CRUD**: `create`, `createMany`, `update`, `updateMany`, `remove`, `removeMany`, `softDelete`, `softDeleteMany`, `restore`
- **Queries**: `findById`, `findOne`, `listOffset`, `listCursor`
- **Caching**: Redis with SWR pattern
- **Transactions**: `runInTransaction`
- **Lifecycle hooks**: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`

## Refactoring Safety
- Do not change public method signatures in service/controller without adding an adapter layer.
- When renaming columns/props in entities, ADD a temporary mapping layer in the service.
- Preserve relation/select whitelists.
- Use transaction support for complex operations.

## Example Configuration
```typescript
@Injectable()
export class ArticlesService extends BaseService<Article> {
  constructor(@InjectRepository(Article) repo, cache: CacheService) {
    super(new TypeOrmBaseRepository(repo), {
        entityName: 'Article',
        cache: { enabled: true, ttlSec: 60, prefix: 'articles', swrSec: 30 },
        defaultSearchField: 'title',
        relationsWhitelist: { user: { avatar: true } },
        selectWhitelist: { id: true, title: true, user: { id: true, username: true } },
      }, cache);
  }

  protected getSearchableColumns(): (keyof Article)[] {
    return ['title', 'summary', 'content'];
  }
}
```
