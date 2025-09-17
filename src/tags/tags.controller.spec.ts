import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

// Mock the Auth decorator
jest.mock('src/common/decorators', () => ({
  Auth:
    () =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      return descriptor;
    },
}));

describe('TagsController', () => {
  let controller: TagsController;

  const mockTagsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getPopularTags: jest.fn(),
    getTrendingTags: jest.fn(),
    getFeaturedTags: jest.fn(),
    getStats: jest.fn(),
    getContentSuggestions: jest.fn(),
    bulkCreate: jest.fn(),
    updateUsageCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
