import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { CreateTagDto, QueryTagsDto } from './dto';
import { TAG_CONSTANTS } from 'src/shared/constants/tag.constants';
import { CacheService } from 'src/shared/services';
import { IPagination } from 'src/common/interface';

describe('TagsService', () => {
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

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'deletedAt' },
        { propertyName: 'id' },
        { propertyName: 'name' },
      ],
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    deleteKeysByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new tag successfully', async () => {
      const createTagDto: CreateTagDto = {
        name: 'JavaScript',
        description: 'JavaScript programming language',
        color: '#3B82F6',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockTag);
      mockRepository.save.mockResolvedValue(mockTag);
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      const result = await service.create(createTagDto);

      expect(result).toEqual(mockTag);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'javascript' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'JavaScript',
          slug: 'javascript',
          color: '#3B82F6',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle slug conflict during creation', async () => {
      const createTagDto: CreateTagDto = {
        name: 'JavaScript',
      };

      // Mock repository to simulate slug conflict
      mockRepository.findOne.mockResolvedValue(mockTag);
      mockRepository.create.mockReturnValue(mockTag);
      mockRepository.save.mockRejectedValue(new Error('Duplicate key'));

      await expect(service.create(createTagDto)).rejects.toThrow();
    });

    it('should generate slug if not provided', async () => {
      const createTagDto: CreateTagDto = {
        name: 'React Hooks',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockTag);
      mockRepository.save.mockResolvedValue(mockTag);
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      await service.create(createTagDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'react-hooks',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tags with default filters', async () => {
      const query: QueryTagsDto = {
        page: 1,
        limit: 10,
        sortBy: 'usage',
        order: 'DESC',
      };

      const mockResult = {
        result: [mockTag],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          hasNextPage: false,
        },
      };

      jest
        .spyOn(service, 'listOffset')
        .mockResolvedValue(mockResult as IPagination<Tag>);

      const result = await service.findAll(query);

      expect(result).toEqual(mockResult);
    });

    it('should apply search filter when query is provided', async () => {
      const query: QueryTagsDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        query: 'javascript',
      };

      const mockResult = {
        result: [mockTag],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          hasNextPage: false,
        },
      };

      jest
        .spyOn(service, 'listOffset')
        .mockResolvedValue(mockResult as IPagination<Tag>);

      const result = await service.findAll(query);

      expect(result).toEqual(mockResult);
    });
  });

  describe('findBySlug', () => {
    it('should return tag by slug', async () => {
      const slug = 'javascript';

      jest.spyOn(service, 'findOne').mockResolvedValue(mockTag as Tag);

      const result = await service.findBySlug(slug);

      expect(result).toEqual(mockTag);
      expect(service.findOne).toHaveBeenCalledWith({ slug });
    });

    it('should throw not found error if tag does not exist', async () => {
      const slug = 'non-existent';

      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.findBySlug(slug)).rejects.toThrow(
        new HttpException(
          { messageKey: 'tag.NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('updateUsageCount', () => {
    it('should increment tag usage count', async () => {
      const tagId = '123456789';
      const increment = 5;

      mockRepository.increment.mockResolvedValue({ affected: 1 });
      mockCacheService.deletePattern.mockResolvedValue(undefined);

      await service.updateUsageCount(tagId, increment);

      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: tagId },
        'usageCount',
        increment,
      );
      expect(mockCacheService.deleteKeysByPattern).toHaveBeenCalled();
    });
  });

  describe('getPopularTags', () => {
    it('should return popular tags from cache', async () => {
      const limit = 10;
      const cachedTags = [mockTag];

      mockCacheService.get.mockResolvedValue(cachedTags);

      const result = await service.getPopularTags(limit);

      expect(result).toEqual(cachedTags);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^tags:popular:/),
      );
    });

    it('should fetch popular tags from database if not cached', async () => {
      const limit = 10;

      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([mockTag]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getPopularTags(limit);

      expect(result).toEqual([mockTag]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          usageCount: expect.any(Object),
        },
        order: { usageCount: 'DESC' },
        take: limit,
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^tags:popular:/),
        [mockTag],
        TAG_CONSTANTS.CACHE.POPULAR_TTL_SEC,
      );
    });
  });

  describe('getStats', () => {
    it('should return cached statistics', async () => {
      const cachedStats = {
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

      mockCacheService.get.mockResolvedValue(cachedStats);

      const result = await service.getStats();

      expect(result).toEqual(cachedStats);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^tags:stats:/),
      );
    });

    it('should calculate statistics from database if not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.count
        .mockResolvedValueOnce(100) // totalTags
        .mockResolvedValueOnce(95) // activeTags
        .mockResolvedValueOnce(5) // inactiveTags
        .mockResolvedValueOnce(10) // featuredTags
        .mockResolvedValueOnce(50) // popularTags
        .mockResolvedValueOnce(20); // trendingTags

      // Mock repository calls for helper methods
      mockRepository.find
        .mockResolvedValueOnce([{ usageCount: 1000 }]) // getTotalUsageCount
        .mockResolvedValueOnce([{ name: 'JavaScript', usageCount: 150 }]) // getMostUsedTag
        .mockResolvedValueOnce([{ metadata: { category: 'technology' } }]) // getTagsByCategory
        .mockResolvedValueOnce([{ color: '#3B82F6' }]) // getTagsByColor
        .mockResolvedValueOnce([{ createdAt: new Date('2024-01-01') }]); // getRecentTrends

      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.totalTags).toBe(100);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^tags:stats:/),
        expect.any(Object),
        TAG_CONSTANTS.CACHE.STATS_TTL_SEC,
      );
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple tags successfully', async () => {
      const tagNames = ['JavaScript', 'React', 'Node.js'];
      const mockTags = [
        { ...mockTag, name: 'JavaScript' },
        { ...mockTag, name: 'React' },
        { ...mockTag, name: 'Node.js' },
      ] as Tag[];

      jest.spyOn(service, 'createMany').mockResolvedValue(mockTags);

      const result = await service.bulkCreate(tagNames);

      expect(result).toHaveLength(3);
      expect(service.createMany).toHaveBeenCalledWith(
        tagNames.map((name) => ({ name })),
      );
    });

    it('should handle empty tag names array', async () => {
      const tagNames: string[] = [];

      jest.spyOn(service, 'createMany').mockResolvedValue([]);

      const result = await service.bulkCreate(tagNames);

      expect(result).toHaveLength(0);
      expect(service.createMany).toHaveBeenCalledWith([]);
    });
  });

  describe('getContentSuggestions', () => {
    it('should return tag suggestions based on content', async () => {
      const content = 'Learn JavaScript and React for modern web development';

      mockRepository.findOne.mockResolvedValue(mockTag);

      const result = await service.getContentSuggestions(content);

      expect(result).toContain(mockTag);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'javascript', isActive: true },
      });
    });

    it('should return empty array for content with no matching tags', async () => {
      const content = 'Random content with no programming keywords';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getContentSuggestions(content);

      expect(result).toEqual([]);
    });
  });
});
