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
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
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

    it('should throw conflict error if slug already exists', async () => {
      const createTagDto: CreateTagDto = {
        name: 'JavaScript',
      };

      mockRepository.findOne.mockResolvedValue(mockTag);

      await expect(service.create(createTagDto)).rejects.toThrow(
        new HttpException(
          {
            messageKey: 'tag.SLUG_ALREADY_EXISTS',
            suggestion: expect.any(String),
          },
          HttpStatus.CONFLICT,
        ),
      );
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
      expect(service.findOne).toHaveBeenCalledWith(
        { slug },
        { relations: ['articles'] },
      );
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
      expect(mockCacheService.deletePattern).toHaveBeenCalled();
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
        `tags:popular:${limit}`,
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
        `tags:popular:${limit}`,
        [mockTag],
        TAG_CONSTANTS.CACHE.POPULAR_TTL_SEC,
      );
    });
  });

  describe('searchTags', () => {
    it('should return empty array for short query', async () => {
      const result = await service.searchTags('a');

      expect(result).toEqual([]);
    });

    it('should return search results from cache', async () => {
      const query = 'javascript';
      const limit = 10;
      const cachedResults = [mockTag];

      mockCacheService.get.mockResolvedValue(cachedResults);

      const result = await service.searchTags(query, limit);

      expect(result).toEqual(cachedResults);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `tags:search:${query}:${limit}`,
      );
    });

    it('should search tags in database if not cached', async () => {
      const query = 'javascript';
      const limit = 10;

      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue([mockTag]);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.searchTags(query, limit);

      expect(result).toEqual([mockTag]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: [
          { name: expect.any(Object), isActive: true },
          { description: expect.any(Object), isActive: true },
        ],
        order: { usageCount: 'DESC' },
        take: limit,
      });
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
      expect(mockCacheService.get).toHaveBeenCalledWith('tags:stats');
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

      // Mock the helper methods
      jest.spyOn(service, 'getTotalUsageCount').mockResolvedValue(1000);
      jest.spyOn(service, 'getMostUsedTag').mockResolvedValue({
        name: 'JavaScript',
        usageCount: 150,
      });
      jest.spyOn(service, 'getTagsByCategory').mockResolvedValue({
        technology: 50,
      });
      jest.spyOn(service, 'getTagsByColor').mockResolvedValue({
        '#3B82F6': 20,
      });
      jest.spyOn(service, 'getRecentTrends').mockResolvedValue([]);

      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.totalTags).toBe(100);
      expect(result.totalUsageCount).toBe(1000);
      expect(result.mostUsedTag).toBe('JavaScript');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'tags:stats',
        expect.any(Object),
        TAG_CONSTANTS.CACHE.STATS_TTL_SEC,
      );
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple tags successfully', async () => {
      const tagNames = ['JavaScript', 'React', 'Node.js'];

      jest
        .spyOn(service, 'create')
        .mockResolvedValueOnce({ ...mockTag, name: 'JavaScript' } as Tag)
        .mockResolvedValueOnce({ ...mockTag, name: 'React' } as Tag)
        .mockResolvedValueOnce({ ...mockTag, name: 'Node.js' } as Tag);

      const result = await service.bulkCreate(tagNames);

      expect(result).toHaveLength(3);
      expect(service.create).toHaveBeenCalledTimes(3);
    });

    it('should skip existing tags and continue with others', async () => {
      const tagNames = ['JavaScript', 'React'];

      jest
        .spyOn(service, 'create')
        .mockResolvedValueOnce({ ...mockTag, name: 'JavaScript' } as Tag)
        .mockRejectedValueOnce(
          new HttpException('Conflict', HttpStatus.CONFLICT),
        );

      const result = await service.bulkCreate(tagNames);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('JavaScript');
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

  describe('getTotalUsageCount', () => {
    it('should return total usage count across all tags', async () => {
      const tags = [
        { usageCount: 100 },
        { usageCount: 200 },
        { usageCount: 300 },
      ];

      mockRepository.find.mockResolvedValue(tags);

      const result = await service.getTotalUsageCount();

      expect(result).toBe(600);
      expect(mockRepository.find).toHaveBeenCalledWith({
        select: ['usageCount'],
      });
    });
  });

  describe('getMostUsedTag', () => {
    it('should return most used tag', async () => {
      const mostUsedTag = { name: 'JavaScript', usageCount: 150 };

      mockRepository.findOne.mockResolvedValue(mostUsedTag);

      const result = await service.getMostUsedTag();

      expect(result).toEqual(mostUsedTag);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        select: ['name', 'usageCount'],
        order: { usageCount: 'DESC' },
      });
    });

    it('should return null if no tags exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getMostUsedTag();

      expect(result).toBeNull();
    });
  });

  describe('getTagsByCategory', () => {
    it('should return tags grouped by category', async () => {
      const tags = [
        { metadata: { category: 'technology' } },
        { metadata: { category: 'technology' } },
        { metadata: { category: 'lifestyle' } },
        { metadata: { category: 'business' } },
        { metadata: { other: 'value' } }, // Should be ignored
      ];

      mockRepository.find.mockResolvedValue(tags);

      const result = await service.getTagsByCategory();

      expect(result).toEqual({
        technology: 2,
        lifestyle: 1,
        business: 1,
      });
    });

    it('should return empty object if no tags with categories exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getTagsByCategory();

      expect(result).toEqual({});
    });
  });

  describe('getTagsByColor', () => {
    it('should return tags grouped by color', async () => {
      const tags = [
        { color: '#3B82F6' },
        { color: '#3B82F6' },
        { color: '#10B981' },
        { color: '#F59E0B' },
        { color: null }, // Should be ignored
      ];

      mockRepository.find.mockResolvedValue(tags);

      const result = await service.getTagsByColor();

      expect(result).toEqual({
        '#3B82F6': 2,
        '#10B981': 1,
        '#F59E0B': 1,
      });
    });
  });

  describe('getRecentTrends', () => {
    it('should return recent trends for last 30 days', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const tags = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-02') },
        { createdAt: new Date('2024-01-15') },
      ];

      mockRepository.find.mockResolvedValue(tags);

      const result = await service.getRecentTrends();

      expect(result).toEqual([
        { date: '2024-01-01', count: 2 },
        { date: '2024-01-02', count: 1 },
        { date: '2024-01-15', count: 1 },
      ]);
    });

    it('should return empty array if no tags in last 30 days', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getRecentTrends();

      expect(result).toEqual([]);
    });
  });
});
