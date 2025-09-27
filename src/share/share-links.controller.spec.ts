import { Test, TestingModule } from '@nestjs/testing';

import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { ShareService } from './share.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareMetricsDto } from './dto/share-metrics.dto';

describe('ShareLinksController', () => {
  let controller: ShareLinksController;
  let shareLinksService: ShareLinksService;
  let shareService: ShareService;

  const mockShareLinksService = {
    createShareLink: jest.fn(),
    getShareLinksForContent: jest.fn(),
    getShareLinkMetrics: jest.fn(),
  };

  const mockShareService = {
    createShareLink: jest.fn(),
    getShareLinkByCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareLinksController],
      providers: [
        {
          provide: ShareLinksService,
          useValue: mockShareLinksService,
        },
        {
          provide: ShareService,
          useValue: mockShareService,
        },
      ],
    }).compile();

    controller = module.get<ShareLinksController>(ShareLinksController);
    shareLinksService = module.get<ShareLinksService>(ShareLinksService);
    shareService = module.get<ShareService>(ShareService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createShareLink', () => {
    it('should create a share link', async () => {
      const createShareLinkDto: CreateShareLinkDto = {
        contentType: 'article',
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

      jest
        .spyOn(shareLinksService, 'createShareLink')
        .mockResolvedValue(mockShareLink as any);

      const result = await controller.createShareLink(createShareLinkDto);

      expect(result).toEqual(mockShareLink);
      expect(shareLinksService.createShareLink).toHaveBeenCalledWith(
        createShareLinkDto,
      );
    });
  });

  describe('getShareLinksForContent', () => {
    it('should return share links for content', async () => {
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
          summary: {
            totalClicks: 100,
            clicksToday: 10,
            clicksYesterday: 5,
            clicksLast7Days: 50,
            totalConversions: 5,
          },
        },
      ];

      jest
        .spyOn(shareLinksService, 'getShareLinksForContent')
        .mockResolvedValue(mockShareLinks as any);

      const result = await controller.getShareLinksForContent(
        contentType,
        contentId,
      );

      expect(result).toEqual(mockShareLinks);
      expect(shareLinksService.getShareLinksForContent).toHaveBeenCalledWith(
        contentType,
        contentId,
      );
    });
  });

  describe('getShareLinksForPost', () => {
    it('should return share links for a post (legacy)', async () => {
      const postId = '123';
      const mockShareLinks = [
        {
          id: '1',
          code: 'abc123',
          contentType: 'article',
          contentId: postId,
          ownerUserId: '456',
          isActive: true,
          summary: {
            totalClicks: 100,
            clicksToday: 10,
            clicksYesterday: 5,
            clicksLast7Days: 50,
            totalConversions: 5,
          },
        },
      ];

      jest
        .spyOn(shareLinksService, 'getShareLinksForContent')
        .mockResolvedValue(mockShareLinks as any);

      const result = await controller.getShareLinksForPost(postId);

      expect(result).toEqual(mockShareLinks);
      expect(shareLinksService.getShareLinksForContent).toHaveBeenCalledWith(
        'article',
        postId,
      );
    });
  });

  describe('getShareLinkMetrics', () => {
    it('should return metrics for a share link', async () => {
      const code = 'abc123';
      const metricsDto: ShareMetricsDto = {
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const mockMetrics = {
        clicks: 100,
        uniques: 50,
        conversions: 5,
        conversionValue: 1000,
        topReferrers: [
          { referrer: 'google.com', clicks: 30 },
          { referrer: 'facebook.com', clicks: 20 },
        ],
        geoDistribution: [
          { country: 'US', clicks: 40 },
          { country: 'CA', clicks: 10 },
        ],
        dailyBreakdown: [
          {
            date: '2024-01-01',
            clicks: 10,
            uniques: 8,
            conversions: 1,
            conversionValue: 200,
          },
        ],
      };

      jest
        .spyOn(shareLinksService, 'getShareLinkMetrics')
        .mockResolvedValue(mockMetrics);

      const result = await controller.getShareLinkMetrics(code, metricsDto);

      expect(result).toEqual(mockMetrics);
      expect(shareLinksService.getShareLinkMetrics).toHaveBeenCalledWith(
        code,
        metricsDto,
      );
    });
  });
});
