import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, QueryTagsDto } from './dto';
import { Tag } from './entities/tag.entity';
import { IPagination } from 'src/common/interface';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTag: Partial<Tag> = {
    id: '123456789',
    name: 'JavaScript',
    slug: 'javascript',
    description: 'JavaScript programming language',
    color: '#3B82F6',
    icon: '🚀',
    usageCount: 150,
    isActive: true,
    isFeatured: false,
    metaTitle: 'JavaScript - Articles and Stories',
    metaDescription: 'Discover articles about JavaScript programming',
    metadata: { category: 'technology' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    displayName: '🚀 JavaScript',
    isPopular: true,
    url: '/tags/javascript',
    articles: [],
  };

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
    searchTags: jest.fn(),
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
    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new tag', async () => {
      const createTagDto: CreateTagDto = {
        name: 'JavaScript',
        description: 'JavaScript programming language',
        color: '#3B82F6',
      };

      mockTagsService.create.mockResolvedValue(mockTag);

      const result = await controller.create(createTagDto);

      expect(result).toEqual(mockTag);
      expect(service.create).toHaveBeenCalledWith(createTagDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated tags', async () => {
      const query: QueryTagsDto = {
        page: 1,
        limit: 10,
        sortBy: 'usage',
        order: 'DESC',
      };

      const mockResult: IPagination<Tag> = {
        result: [mockTag as Tag],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          hasNextPage: false,
        },
      };

      mockTagsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getPopularTags', () => {
    it('should return popular tags', async () => {
      const limit = 10;
      const mockTags = [mockTag];

      mockTagsService.getPopularTags.mockResolvedValue(mockTags);

      const result = await controller.getPopularTags(limit);

      expect(result).toEqual(mockTags);
      expect(service.getPopularTags).toHaveBeenCalledWith(limit);
    });

    it('should return popular tags with default limit', async () => {
      const mockTags = [mockTag];

      mockTagsService.getPopularTags.mockResolvedValue(mockTags);

      const result = await controller.getPopularTags();

      expect(result).toEqual(mockTags);
      expect(service.getPopularTags).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getTrendingTags', () => {
    it('should return trending tags', async () => {
      const limit = 10;
      const mockTags = [mockTag];

      mockTagsService.getTrendingTags.mockResolvedValue(mockTags);

      const result = await controller.getTrendingTags(limit);

      expect(result).toEqual(mockTags);
      expect(service.getTrendingTags).toHaveBeenCalledWith(limit);
    });
  });

  describe('getFeaturedTags', () => {
    it('should return featured tags', async () => {
      const limit = 10;
      const mockTags = [mockTag];

      mockTagsService.getFeaturedTags.mockResolvedValue(mockTags);

      const result = await controller.getFeaturedTags(limit);

      expect(result).toEqual(mockTags);
      expect(service.getFeaturedTags).toHaveBeenCalledWith(limit);
    });
  });

  describe('searchTags', () => {
    it('should search tags by query', async () => {
      const query = 'javascript';
      const limit = 10;
      const mockTags = [mockTag];

      mockTagsService.searchTags.mockResolvedValue(mockTags);

      const result = await controller.searchTags(query, limit);

      expect(result).toEqual(mockTags);
      expect(service.searchTags).toHaveBeenCalledWith(query, limit);
    });

    it('should search tags with default limit', async () => {
      const query = 'javascript';
      const mockTags = [mockTag];

      mockTagsService.searchTags.mockResolvedValue(mockTags);

      const result = await controller.searchTags(query);

      expect(result).toEqual(mockTags);
      expect(service.searchTags).toHaveBeenCalledWith(query, undefined);
    });
  });

  describe('getStats', () => {
    it('should return tag statistics', async () => {
      const mockStats = {
        totalTags: 100,
        activeTags: 95,
        inactiveTags: 5,
        featuredTags: 10,
        popularTags: 50,
        trendingTags: 20,
        totalUsageCount: 1000,
        averageUsageCount: 10,
        mostUsedTag: 'JavaScript',
        mostUsedTagCount: 150,
        tagsByCategory: { technology: 50 },
        tagsByColor: { '#3B82F6': 20 },
        recentTrends: [],
      };

      mockTagsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('getContentSuggestions', () => {
    it('should return tag suggestions based on content', async () => {
      const content = 'Learn JavaScript and React';
      const mockTags = [mockTag];

      mockTagsService.getContentSuggestions.mockResolvedValue(mockTags);

      const result = await controller.getContentSuggestions(content);

      expect(result).toEqual(mockTags);
      expect(service.getContentSuggestions).toHaveBeenCalledWith(content);
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create tags from comma-separated names', async () => {
      const names = 'JavaScript,React,Node.js';
      const mockTags = [
        { ...mockTag, name: 'JavaScript' },
        { ...mockTag, name: 'React' },
        { ...mockTag, name: 'Node.js' },
      ] as Tag[];

      mockTagsService.bulkCreate.mockResolvedValue(mockTags);

      const result = await controller.bulkCreate(names);

      expect(result).toEqual(mockTags);
      expect(service.bulkCreate).toHaveBeenCalledWith([
        'JavaScript',
        'React',
        'Node.js',
      ]);
    });

    it('should handle empty names string', async () => {
      const names = '';
      const mockTags: Tag[] = [];

      mockTagsService.bulkCreate.mockResolvedValue(mockTags);

      const result = await controller.bulkCreate(names);

      expect(result).toEqual(mockTags);
      expect(service.bulkCreate).toHaveBeenCalledWith([]);
    });
  });

  describe('findById', () => {
    it('should return tag by ID', async () => {
      const id = '123456789';

      mockTagsService.findById.mockResolvedValue(mockTag);

      const result = await controller.findById(id);

      expect(result).toEqual(mockTag);
      expect(service.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('findBySlug', () => {
    it('should return tag by slug', async () => {
      const slug = 'javascript';

      mockTagsService.findBySlug.mockResolvedValue(mockTag);

      const result = await controller.findBySlug(slug);

      expect(result).toEqual(mockTag);
      expect(service.findBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('update', () => {
    it('should update tag', async () => {
      const id = '123456789';
      const updateTagDto: UpdateTagDto = {
        name: 'Updated JavaScript',
        description: 'Updated description',
      };

      const updatedTag = { ...mockTag, ...updateTagDto };

      mockTagsService.update.mockResolvedValue(updatedTag);

      const result = await controller.update(id, updateTagDto);

      expect(result).toEqual(updatedTag);
      expect(service.update).toHaveBeenCalledWith(id, updateTagDto);
    });
  });

  describe('remove', () => {
    it('should delete tag', async () => {
      const id = '123456789';

      mockTagsService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('updateUsageCount', () => {
    it('should update tag usage count', async () => {
      const id = '123456789';
      const increment = 5;

      mockTagsService.updateUsageCount.mockResolvedValue(undefined);

      await controller.updateUsageCount(id, increment);

      expect(service.updateUsageCount).toHaveBeenCalledWith(id, increment);
    });

    it('should update tag usage count with default increment', async () => {
      const id = '123456789';

      mockTagsService.updateUsageCount.mockResolvedValue(undefined);

      await controller.updateUsageCount(id);

      expect(service.updateUsageCount).toHaveBeenCalledWith(id, 1);
    });
  });
});
