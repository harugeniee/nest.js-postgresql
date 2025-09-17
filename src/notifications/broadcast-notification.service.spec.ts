import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { HttpException } from '@nestjs/common';
import { BroadcastNotificationService } from './broadcast-notification.service';
import { BroadcastNotification } from './entities/broadcast-notification.entity';
import { CacheService } from 'src/shared/services';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('BroadcastNotificationService', () => {
  let service: BroadcastNotificationService;
  let broadcastRepository: Repository<BroadcastNotification>;
  let cacheService: CacheService;

  const mockBroadcast = {
    id: '1234567890123456789',
    title: 'System Maintenance',
    message: 'We will perform maintenance on our servers',
    type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
    priority: NOTIFICATION_CONSTANTS.PRIORITY.HIGH,
    isActive: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    actionUrl: 'https://example.com/maintenance',
    metadata: { maintenanceWindow: '2 hours' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastNotificationService,
        {
          provide: getRepositoryToken(BroadcastNotification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn(),
            })),
            metadata: {
              columns: [],
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BroadcastNotificationService>(
      BroadcastNotificationService,
    );
    broadcastRepository = module.get<Repository<BroadcastNotification>>(
      getRepositoryToken(BroadcastNotification),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBroadcast', () => {
    it('should create a new broadcast notification successfully', async () => {
      const dto = {
        title: 'System Maintenance',
        message: 'We will perform maintenance on our servers',
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
        priority: NOTIFICATION_CONSTANTS.PRIORITY.HIGH,
        isActive: true,
        expiresAt: '2024-12-31T23:59:59Z',
        actionUrl: 'https://example.com/maintenance',
        metadata: { maintenanceWindow: '2 hours' },
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockBroadcast as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      await service.createBroadcast(dto);
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        expiresAt: new Date(dto.expiresAt),
        isActive: true,
        priority: NOTIFICATION_CONSTANTS.PRIORITY.HIGH,
      });
    });

    it('should create broadcast with default values', async () => {
      const dto = {
        title: 'System Maintenance',
        message: 'We will perform maintenance on our servers',
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockBroadcast as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      await service.createBroadcast(dto);

      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        expiresAt: undefined,
        isActive: true,
        priority: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
      });
    });

    it('should handle errors during broadcast creation', async () => {
      const dto = {
        title: 'System Maintenance',
        message: 'We will perform maintenance on our servers',
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createBroadcast(dto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('updateBroadcast', () => {
    it('should update broadcast notification successfully', async () => {
      const id = '1234567890123456789';
      const dto = {
        title: 'Updated Maintenance Notice',
        isActive: false,
      };

      const updatedBroadcast = { ...mockBroadcast, ...dto };

      jest.spyOn(service, 'findById').mockResolvedValue(mockBroadcast as any);
      jest.spyOn(service, 'update').mockResolvedValue(updatedBroadcast as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.updateBroadcast(id, dto);

      expect(result).toEqual(updatedBroadcast);
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, {
        ...dto,
        expiresAt: mockBroadcast.expiresAt,
      });
    });

    it('should throw not found error when broadcast does not exist', async () => {
      const id = '1234567890123456789';
      const dto = { title: 'Updated Title' };

      jest.spyOn(service, 'findById').mockResolvedValue(undefined as any);

      await expect(service.updateBroadcast(id, dto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getActiveBroadcasts', () => {
    it('should return active broadcasts from cache', async () => {
      const cachedBroadcasts = [mockBroadcast];

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedBroadcasts);

      const result = await service.getActiveBroadcasts();

      expect(result).toEqual(cachedBroadcasts);
      expect(broadcastRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch and cache active broadcasts when not in cache', async () => {
      const broadcasts = [mockBroadcast];

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest
        .spyOn(broadcastRepository, 'find')
        .mockResolvedValue(broadcasts as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getActiveBroadcasts();

      expect(result).toEqual(broadcasts);
      expect(broadcastRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          expiresAt: MoreThan(expect.any(Date)),
        },
        order: { priority: 'DESC', createdAt: 'DESC' },
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'broadcast_notifications:active',
        broadcasts,
        300,
      );
    });
  });

  describe('getBroadcasts', () => {
    it('should get broadcasts with filters', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
        priority: NOTIFICATION_CONSTANTS.PRIORITY.HIGH,
        isActive: true,
        includeExpired: false,
      };

      const mockResult = {
        result: [mockBroadcast],
        metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockResult as any);

      const result = await service.getBroadcasts(query);

      expect(result).toEqual(mockResult);
      expect(service.listOffset).toHaveBeenCalledWith(query, {
        type: query.type,
        priority: query.priority,
        isActive: query.isActive,
        expiresAt: MoreThan(expect.any(Date)),
      });
    });

    it('should get broadcasts without filters', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC' as const };

      const mockResult = {
        result: [mockBroadcast],
        metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockResult as any);

      const result = await service.getBroadcasts(query);

      expect(result).toEqual(mockResult);
      expect(service.listOffset).toHaveBeenCalledWith(query, {});
    });
  });

  describe('getBroadcastStats', () => {
    it('should return broadcast statistics', async () => {
      jest.spyOn(broadcastRepository, 'count').mockResolvedValue(100);
      jest.spyOn(broadcastRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { type: 'system_announcement', count: '40' },
            { type: 'maintenance', count: '60' },
          ])
          .mockResolvedValueOnce([
            { priority: 'high', count: '20' },
            { priority: 'normal', count: '80' },
          ]),
      } as any);

      // Mock the count calls for active and expired
      jest
        .spyOn(broadcastRepository, 'count')
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50) // active
        .mockResolvedValueOnce(30); // expired

      const result = await service.getBroadcastStats();

      expect(result).toEqual({
        total: 100,
        active: 50,
        expired: 30,
        byType: { system_announcement: 40, maintenance: 60 },
        byPriority: { high: 20, normal: 80 },
      });
    });
  });

  describe('deactivateExpiredBroadcasts', () => {
    it('should deactivate expired broadcasts successfully', async () => {
      const mockResult = { affected: 5 };

      jest
        .spyOn(broadcastRepository, 'update')
        .mockResolvedValue(mockResult as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.deactivateExpiredBroadcasts();

      expect(result).toEqual({ deactivated: 5 });
      expect(broadcastRepository.update).toHaveBeenCalledWith(
        {
          isActive: true,
          expiresAt: LessThan(expect.any(Date)),
        },
        { isActive: false },
      );
    });

    it('should handle case when no broadcasts are deactivated', async () => {
      const mockResult = { affected: 0 };

      jest
        .spyOn(broadcastRepository, 'update')
        .mockResolvedValue(mockResult as any);

      const result = await service.deactivateExpiredBroadcasts();

      expect(result).toEqual({ deactivated: 0 });
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('invalidateActiveBroadcastsCache', () => {
    it('should invalidate active broadcasts cache', async () => {
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      // Access private method through any cast
      await (service as any).invalidateActiveBroadcastsCache();

      expect(cacheService.delete).toHaveBeenCalledWith(
        'broadcast_notifications:active',
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      jest
        .spyOn(cacheService, 'delete')
        .mockRejectedValue(new Error('Cache error'));

      // Should not throw error
      await expect(
        (service as any).invalidateActiveBroadcastsCache(),
      ).resolves.not.toThrow();
    });
  });
});
