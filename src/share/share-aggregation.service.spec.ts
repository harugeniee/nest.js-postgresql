import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShareAggregationService } from './share-aggregation.service';
import { ShareAggDaily } from './entities/share-agg-daily.entity';
import { ShareLink } from './entities/share-link.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { CacheService } from 'src/shared/services';

describe('ShareAggregationService', () => {
  let service: ShareAggregationService;
  let shareAggDailyRepository: Repository<ShareAggDaily>;
  let shareLinkRepository: Repository<ShareLink>;
  let shareClickRepository: Repository<ShareClick>;
  let shareConversionRepository: Repository<ShareConversion>;
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

  const mockShareClickRepository = {
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

  const mockShareConversionRepository = {
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
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareAggregationService,
        {
          provide: getRepositoryToken(ShareAggDaily),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareLink),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareClick),
          useValue: mockShareClickRepository,
        },
        {
          provide: getRepositoryToken(ShareConversion),
          useValue: mockShareConversionRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ShareAggregationService>(ShareAggregationService);
    shareAggDailyRepository = module.get<Repository<ShareAggDaily>>(
      getRepositoryToken(ShareAggDaily),
    );
    shareLinkRepository = module.get<Repository<ShareLink>>(
      getRepositoryToken(ShareLink),
    );
    shareClickRepository = module.get<Repository<ShareClick>>(
      getRepositoryToken(ShareClick),
    );
    shareConversionRepository = module.get<Repository<ShareConversion>>(
      getRepositoryToken(ShareConversion),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregateDay', () => {
    it('should aggregate metrics for all active share links', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');

      const mockShareLinks = [{ id: 'share1' }, { id: 'share2' }];

      jest
        .spyOn(shareLinkRepository, 'find')
        .mockResolvedValue(mockShareLinks as any);

      // Mock the private method
      const aggregateShareLinkForDaySpy = jest
        .spyOn(service as any, 'aggregateShareLinkForDay')
        .mockResolvedValue(undefined);

      await service.aggregateDay(startDate, endDate);

      expect(shareLinkRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        select: ['id'],
      });
      expect(aggregateShareLinkForDaySpy).toHaveBeenCalledTimes(2);
      expect(aggregateShareLinkForDaySpy).toHaveBeenCalledWith(
        'share1',
        startDate,
        endDate,
        '2024-01-01',
      );
      expect(aggregateShareLinkForDaySpy).toHaveBeenCalledWith(
        'share2',
        startDate,
        endDate,
        '2024-01-01',
      );
    });
  });

  describe('createAggregation', () => {
    it('should create new daily aggregation', async () => {
      const shareId = 'share1';
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-02T00:00:00Z');
      const dayString = '2024-01-01';

      const mockAggregation = {
        id: '1',
        shareId,
        day: dayString,
        clicks: 10,
        uniques: 5,
        convs: 2,
        convValue: 20.0,
      };

      // Mock repository methods with proper return values
      mockShareClickRepository.count.mockResolvedValue(10);
      mockShareConversionRepository.count.mockResolvedValue(2);

      mockShareClickRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '5' }),
      } as any);

      mockShareConversionRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '20.0' }),
      } as any);

      mockRepository.create.mockReturnValue(mockAggregation as any);
      mockRepository.save.mockResolvedValue(mockAggregation as any);

      // Call the private method
      await (service as any).createAggregation(
        shareId,
        startDate,
        endDate,
        dayString,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        shareId,
        day: dayString,
        clicks: 10,
        uniques: 5,
        convs: 2,
        convValue: 20.0,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        mockAggregation,
      );
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return aggregated metrics for date range', async () => {
      const shareId = 'share1';
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const mockAggregations = [
        {
          id: '1',
          shareId,
          day: new Date('2024-01-01'),
          clicks: 10,
          uniques: 5,
          convs: 2,
          convValue: 20.0,
        },
        {
          id: '2',
          shareId,
          day: new Date('2024-01-02'),
          clicks: 15,
          uniques: 8,
          convs: 3,
          convValue: 30.0,
        },
      ];

      jest
        .spyOn(shareAggDailyRepository, 'find')
        .mockResolvedValue(mockAggregations as any);

      const result = await service.getAggregatedMetrics(
        shareId,
        fromDate,
        toDate,
      );

      expect(result).toEqual({
        totalClicks: 25,
        totalUniques: 13,
        totalConversions: 5,
        totalConversionValue: 50.0,
        dailyBreakdown: [
          {
            date: mockAggregations[0].day,
            clicks: 10,
            uniques: 5,
            conversions: 2,
            conversionValue: 20.0,
          },
          {
            date: mockAggregations[1].day,
            clicks: 15,
            uniques: 8,
            conversions: 3,
            conversionValue: 30.0,
          },
        ],
      });
    });
  });

  describe('cleanupOldAggregations', () => {
    it('should clean up old aggregation data', async () => {
      const mockResult = { affected: 100 };

      jest
        .spyOn(shareAggDailyRepository, 'createQueryBuilder')
        .mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(mockResult),
        } as any);

      await service.cleanupOldAggregations();

      expect(shareAggDailyRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('cleanupOldClicks', () => {
    it('should clean up old click data', async () => {
      const mockResult = { affected: 50 };

      jest.spyOn(shareClickRepository, 'createQueryBuilder').mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockResult),
      } as any);

      await service.cleanupOldClicks();

      expect(shareClickRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
