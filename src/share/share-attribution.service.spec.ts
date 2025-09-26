import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShareAttributionService } from './share-attribution.service';
import { ShareAttribution } from './entities/share-attribution.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import {
  ShareAttributionDto,
  ShareConversionDto,
} from './dto/share-attribution.dto';
import { CacheService } from 'src/shared/services';

describe('ShareAttributionService', () => {
  let service: ShareAttributionService;
  let shareAttributionRepository: Repository<ShareAttribution>;
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
        ShareAttributionService,
        {
          provide: getRepositoryToken(ShareAttribution),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareConversion),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ShareAttributionService>(ShareAttributionService);
    shareAttributionRepository = module.get<Repository<ShareAttribution>>(
      getRepositoryToken(ShareAttribution),
    );
    shareConversionRepository = module.get<Repository<ShareConversion>>(
      getRepositoryToken(ShareConversion),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAttribution', () => {
    it('should create new attribution when none exists', async () => {
      const attributionData: ShareAttributionDto = {
        sessionToken: 'session123',
        viewerUserId: 'user456',
        shareId: 'share789',
      };

      const mockAttribution = {
        id: '1',
        shareId: 'share789',
        viewerUserId: 'user456',
        firstAt: new Date(),
        lastAt: new Date(),
        totalVisits: 1,
      };

      // Mock BaseService methods
      jest.spyOn(service, 'findOne').mockResolvedValue(null);
      jest.spyOn(service, 'create').mockResolvedValue(mockAttribution as any);

      const result = await service.recordAttribution(attributionData);

      expect(result).toEqual(mockAttribution);
      expect(service.findOne).toHaveBeenCalledWith({
        shareId: 'share789',
        viewerUserId: 'user456',
      });
      expect(service.create).toHaveBeenCalledWith({
        shareId: 'share789',
        viewerUserId: 'user456',
        firstAt: expect.any(Date),
        lastAt: expect.any(Date),
        totalVisits: 1,
      });
    });

    it('should update existing attribution', async () => {
      const attributionData: ShareAttributionDto = {
        sessionToken: 'session123',
        viewerUserId: 'user456',
        shareId: 'share789',
      };

      const existingAttribution = {
        id: '1',
        shareId: 'share789',
        viewerUserId: 'user456',
        firstAt: new Date('2024-01-01'),
        lastAt: new Date('2024-01-01'),
        totalVisits: 5,
      };

      const updatedAttribution = {
        ...existingAttribution,
        lastAt: new Date(),
        totalVisits: 6,
      };

      // Mock BaseService methods
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(existingAttribution as any);
      jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedAttribution as any);

      const result = await service.recordAttribution(attributionData);

      expect(result).toEqual(updatedAttribution);
      expect(service.update).toHaveBeenCalledWith('1', {
        lastAt: expect.any(Date),
        totalVisits: 6,
      });
    });
  });

  describe('recordConversion', () => {
    it('should record conversion with attribution', async () => {
      const conversionData: ShareConversionDto = {
        sessionToken: 'session123',
        convType: 'subscribe',
        convValue: 10.0,
        viewerUserId: 'user456',
        shareId: 'share789',
      };

      const mockAttribution = {
        id: '1',
        viewerUserId: 'user456',
        lastAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      const mockConversion = {
        id: '1',
        shareId: 'share789',
        viewerUserId: 'user456',
        convType: 'subscribe',
        convValue: 10.0,
        occurredAt: new Date(),
        attributed: true,
      };

      jest
        .spyOn(shareAttributionRepository, 'findOne')
        .mockResolvedValue(mockAttribution as any);
      jest
        .spyOn(shareConversionRepository, 'create')
        .mockReturnValue(mockConversion as any);
      jest
        .spyOn(shareConversionRepository, 'save')
        .mockResolvedValue(mockConversion as any);

      const result = await service.recordConversion(conversionData);

      expect(result).toEqual(mockConversion);
      expect(shareConversionRepository.create).toHaveBeenCalledWith({
        shareId: 'share789',
        viewerUserId: 'user456',
        convType: 'subscribe',
        convValue: 10.0,
        occurredAt: expect.any(Date),
        attributed: true,
      });
    });

    it('should record conversion without attribution when outside window', async () => {
      const conversionData: ShareConversionDto = {
        sessionToken: 'session123',
        convType: 'subscribe',
        convValue: 10.0,
        viewerUserId: 'user456',
        shareId: 'share789',
      };

      const mockAttribution = {
        id: '1',
        viewerUserId: 'user456',
        lastAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      const mockConversion = {
        id: '1',
        shareId: 'share789',
        viewerUserId: 'user456',
        convType: 'subscribe',
        convValue: 10.0,
        occurredAt: new Date(),
        attributed: false,
      };

      jest
        .spyOn(shareAttributionRepository, 'findOne')
        .mockResolvedValue(mockAttribution as any);
      jest
        .spyOn(shareConversionRepository, 'create')
        .mockReturnValue(mockConversion as any);
      jest
        .spyOn(shareConversionRepository, 'save')
        .mockResolvedValue(mockConversion as any);

      const result = await service.recordConversion(conversionData);

      expect(result).toEqual(mockConversion);
      expect(shareConversionRepository.create).toHaveBeenCalledWith({
        shareId: 'share789',
        viewerUserId: 'user456',
        convType: 'subscribe',
        convValue: 10.0,
        occurredAt: expect.any(Date),
        attributed: false,
      });
    });
  });

  describe('getAttributionStats', () => {
    it('should return attribution statistics', async () => {
      const shareId = 'share789';
      const mockStats = {
        totalAttributions: 10,
        totalVisits: 50,
        recentAttributions: [
          {
            id: '1',
            viewerUserId: 'user456',
            lastAt: new Date(),
            totalVisits: 5,
          },
        ],
      };

      jest.spyOn(shareAttributionRepository, 'count').mockResolvedValue(10);
      jest
        .spyOn(shareAttributionRepository, 'createQueryBuilder')
        .mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '50' }),
        } as any);
      jest
        .spyOn(shareAttributionRepository, 'find')
        .mockResolvedValue(mockStats.recentAttributions as any);

      const result = await service.getAttributionStats(shareId);

      expect(result).toEqual({
        totalAttributions: 10,
        totalVisits: 50,
        recentAttributions: mockStats.recentAttributions,
      });
    });
  });

  describe('getConversionStats', () => {
    it('should return conversion statistics', async () => {
      const shareId = 'share789';
      const mockStats = {
        totalConversions: 5,
        totalConversionValue: 100.0,
        conversionsByType: [
          { type: 'subscribe', count: 3, value: 60.0 },
          { type: 'purchase', count: 2, value: 40.0 },
        ],
      };

      jest.spyOn(shareConversionRepository, 'count').mockResolvedValue(5);
      jest
        .spyOn(shareConversionRepository, 'createQueryBuilder')
        .mockReturnValue({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '100.0' }),
          getRawMany: jest.fn().mockResolvedValue([
            { type: 'subscribe', count: '3', value: '60.0' },
            { type: 'purchase', count: '2', value: '40.0' },
          ]),
        } as any);

      const result = await service.getConversionStats(shareId);

      expect(result).toEqual({
        totalConversions: 5,
        totalConversionValue: 100.0,
        conversionsByType: [
          { type: 'subscribe', count: 3, value: 60.0 },
          { type: 'purchase', count: 2, value: 40.0 },
        ],
      });
    });
  });
});
