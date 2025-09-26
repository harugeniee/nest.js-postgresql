import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShareLinksService } from './share-links.service';
import { ShareLink } from './entities/share-link.entity';
import { CacheService } from 'src/shared/services';

describe('ShareLinksService', () => {
  let service: ShareLinksService;
  let shareLinkRepository: Repository<ShareLink>;
  let cacheService: CacheService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: {
      columns: [],
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    getTtl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareLinksService,
        {
          provide: getRepositoryToken(ShareLink),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ShareLinksService>(ShareLinksService);
    shareLinkRepository = module.get<Repository<ShareLink>>(
      getRepositoryToken(ShareLink),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShareLink', () => {
    it('should create a share link using BaseService', async () => {
      const createShareLinkDto = {
        contentType: 'article' as const,
        contentId: '123',
        ownerUserId: '456',
        channelId: '789',
        campaignId: '101',
        note: 'Test share link',
        isActive: true,
      };

      const mockShareLink = {
        id: '1',
        code: 'abc123',
        ...createShareLinkDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockShareLink as any);

      const result = await service.createShareLink(createShareLinkDto);

      expect(result).toEqual(mockShareLink);
      expect(service.create).toHaveBeenCalledWith(createShareLinkDto);
    });
  });

  describe('getShareLinksForContent', () => {
    it('should return share links for content with summary metrics', async () => {
      const contentType = 'article';
      const contentId = '123';
      const mockShareLinks = [
        {
          id: '1',
          code: 'abc123',
          contentType,
          contentId,
          ownerUserId: '456',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          code: 'def456',
          contentType,
          contentId,
          ownerUserId: '456',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const mockSummary = {
        totalClicks: 100,
        clicksToday: 10,
        clicksYesterday: 5,
        clicksLast7Days: 50,
        totalConversions: 5,
      };

      jest
        .spyOn(shareLinkRepository, 'find')
        .mockResolvedValue(mockShareLinks as any);
      jest
        .spyOn(service as any, 'getShareLinkSummary')
        .mockResolvedValue(mockSummary);

      const result = await service.getShareLinksForContent(
        contentType,
        contentId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockShareLinks[0],
        summary: mockSummary,
      });
      expect(result[1]).toEqual({
        ...mockShareLinks[1],
        summary: mockSummary,
      });
      expect(shareLinkRepository.find).toHaveBeenCalledWith({
        where: { contentType, contentId, isActive: true },
        relations: ['user', 'channel', 'campaign'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getShareLinkMetrics', () => {
    it('should return metrics for a share link', async () => {
      const code = 'abc123';
      const shareId = '1';
      const metricsDto = {
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const mockShareLink = {
        id: shareId,
        code,
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        owner: { id: '456', username: 'testuser' },
      };

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '50', total: '1000' }),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { referrer: 'google.com', clicks: '30' },
            { referrer: 'facebook.com', clicks: '20' },
          ])
          .mockResolvedValueOnce([
            { country: 'US', clicks: '30' },
            { country: 'CA', clicks: '20' },
          ])
          .mockResolvedValueOnce([
            {
              date: '2024-01-01',
              clicks: '30',
              uniques: '25',
              conversions: '2',
              conversionValue: '200',
            },
            {
              date: '2024-01-02',
              clicks: '20',
              uniques: '15',
              conversions: '1',
              conversionValue: '100',
            },
          ]),
      };

      jest
        .spyOn(shareLinkRepository, 'findOne')
        .mockResolvedValue(mockShareLink as any);
      jest
        .spyOn(shareLinkRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getShareLinkMetrics(code, metricsDto);

      expect(result).toEqual({
        clicks: 100,
        uniques: 50,
        conversions: 100,
        conversionValue: 1000,
        topReferrers: [
          { referrer: 'google.com', clicks: 30 },
          { referrer: 'facebook.com', clicks: 20 },
        ],
        geoDistribution: [
          { country: 'US', clicks: 30 },
          { country: 'CA', clicks: 20 },
        ],
        dailyBreakdown: [
          {
            date: '2024-01-01',
            clicks: 30,
            uniques: 25,
            conversions: 2,
            conversionValue: 200,
          },
          {
            date: '2024-01-02',
            clicks: 20,
            uniques: 15,
            conversions: 1,
            conversionValue: 100,
          },
        ],
      });
    });

    it('should throw error if share link not found', async () => {
      const code = 'nonexistent';
      const metricsDto = {
        from: '2024-01-01',
        to: '2024-01-31',
      };

      jest.spyOn(shareLinkRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getShareLinkMetrics(code, metricsDto),
      ).rejects.toThrow('Share link not found');
    });
  });
});
