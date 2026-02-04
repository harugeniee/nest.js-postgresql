---
name: generate-test
description: Generate unit tests for services and controllers following project patterns
user_invocable: true
---

# Generate Tests

Generate unit tests following the project's Jest testing patterns.

## Instructions

When the user invokes this skill (e.g., `/generate-test ArticlesService`), generate test files.

## Service Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { {ServiceName} } from './{module}.service';
import { {EntityName} } from './entities/{module}.entity';
import { CacheService } from 'src/shared/services';

describe('{ServiceName}', () => {
  let service: {ServiceName};
  let repository: jest.Mocked<Repository<{EntityName}>>;
  let cacheService: jest.Mocked<CacheService>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {ServiceName},
        {
          provide: getRepositoryToken({EntityName}),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<{ServiceName}>({ServiceName});
    repository = module.get(getRepositoryToken({EntityName}));
    cacheService = module.get(CacheService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const mockEntity = {
        id: '123456789012345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockEntity);

      const result = await service.findById('123456789012345678');

      expect(result).toEqual(mockEntity);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123456789012345678' },
      });
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return new entity', async () => {
      const createDto = { name: 'Test' };
      const mockEntity = {
        id: '123456789012345678',
        ...createDto,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.create(createDto);

      expect(result).toEqual(mockEntity);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return entity', async () => {
      const id = '123456789012345678';
      const updateDto = { name: 'Updated' };
      const mockEntity = { id, ...updateDto, updatedAt: new Date() };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.update(id, updateDto);

      expect(result).toEqual(mockEntity);
    });

    it('should throw when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', {})).rejects.toThrow();
    });
  });

  describe('softDelete', () => {
    it('should soft delete entity', async () => {
      const id = '123456789012345678';
      const mockEntity = { id, deletedAt: null };

      mockRepository.findOne.mockResolvedValue(mockEntity);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.softDelete(id);

      expect(mockRepository.softDelete).toHaveBeenCalledWith(id);
    });
  });

  describe('listCursor', () => {
    it('should return paginated results', async () => {
      const mockEntities = [
        { id: '1', createdAt: new Date() },
        { id: '2', createdAt: new Date() },
      ];

      mockRepository.find.mockResolvedValue(mockEntities);
      mockRepository.count.mockResolvedValue(2);

      const result = await service.listCursor({ take: 10 });

      expect(result.result).toHaveLength(2);
      expect(result.metaData).toBeDefined();
    });
  });

  // Add custom method tests here
  describe('customMethod', () => {
    it('should handle business logic correctly', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Controller Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { {ControllerName} } from './{module}.controller';
import { {ServiceName} } from './{module}.service';

describe('{ControllerName}', () => {
  let controller: {ControllerName};
  let service: jest.Mocked<{ServiceName}>;

  const mockService = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    listCursor: jest.fn(),
    listOffset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [{ControllerName}],
      providers: [
        {
          provide: {ServiceName},
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<{ControllerName}>({ControllerName});
    service = module.get({ServiceName});

    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return entity by id', async () => {
      const mockEntity = { id: '123', name: 'Test' };
      mockService.findById.mockResolvedValue(mockEntity);

      const result = await controller.findOne('123');

      expect(result).toEqual(mockEntity);
      expect(mockService.findById).toHaveBeenCalledWith('123');
    });
  });

  describe('create', () => {
    it('should create entity with user id', async () => {
      const createDto = { name: 'Test' };
      const mockReq = { user: { uid: 'user123' } };
      const mockEntity = { id: '123', ...createDto, userId: 'user123' };

      mockService.create.mockResolvedValue(mockEntity);

      const result = await controller.create(createDto, mockReq);

      expect(result).toEqual(mockEntity);
      expect(mockService.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 'user123',
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockResult = {
        result: [{ id: '1' }, { id: '2' }],
        metaData: { nextCursor: 'abc', prevCursor: null },
      };
      mockService.listCursor.mockResolvedValue(mockResult);

      const result = await controller.findAll({ take: 10 });

      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should update entity', async () => {
      const updateDto = { name: 'Updated' };
      const mockEntity = { id: '123', ...updateDto };

      mockService.update.mockResolvedValue(mockEntity);

      const result = await controller.update('123', updateDto);

      expect(result).toEqual(mockEntity);
      expect(mockService.update).toHaveBeenCalledWith('123', updateDto);
    });
  });

  describe('remove', () => {
    it('should soft delete entity', async () => {
      mockService.softDelete.mockResolvedValue(undefined);

      await controller.remove('123');

      expect(mockService.softDelete).toHaveBeenCalledWith('123');
    });
  });
});
```

## Test Utilities

### Mock Factory
```typescript
// test/factories/entity.factory.ts
export const createMock{EntityName} = (overrides = {}): {EntityName} => ({
  id: '123456789012345678',
  uuid: 'mock-uuid',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  version: 1,
  ...overrides,
});
```

### Test Helpers
```typescript
// test/helpers/test.helper.ts
export const mockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getManyAndCount: jest.fn(),
});
```

## Test Commands

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run specific test file
yarn test src/articles/articles.service.spec.ts

# Run E2E tests
yarn test:e2e
```

## Test File Location
- Unit tests: `src/{module}/{module}.service.spec.ts`
- Controller tests: `src/{module}/{module}.controller.spec.ts`
- E2E tests: `test/{module}.e2e-spec.ts`

## Important Notes
- Mock all external dependencies (DB, cache, HTTP)
- Use `@nestjs/testing` utilities
- Focus on business logic, not infrastructure
- Test error cases and edge conditions
- Use descriptive test names
- Clear mocks between tests with `jest.clearAllMocks()`
