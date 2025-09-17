import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BroadcastNotificationController } from './broadcast-notification.controller';
import { BroadcastNotificationService } from './broadcast-notification.service';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

describe('BroadcastNotificationController', () => {
  let controller: BroadcastNotificationController;
  let service: BroadcastNotificationService;

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
      controllers: [BroadcastNotificationController],
      providers: [
        {
          provide: BroadcastNotificationService,
          useValue: {
            createBroadcast: jest.fn(),
            getBroadcasts: jest.fn(),
            getActiveBroadcasts: jest.fn(),
            getBroadcastStats: jest.fn(),
            findById: jest.fn(),
            updateBroadcast: jest.fn(),
            remove: jest.fn(),
            deactivateExpiredBroadcasts: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getTtl: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    controller = module.get<BroadcastNotificationController>(
      BroadcastNotificationController,
    );
    service = module.get<BroadcastNotificationService>(
      BroadcastNotificationService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBroadcast', () => {
    it('should create a new broadcast notification', async () => {
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

      jest
        .spyOn(service, 'createBroadcast')
        .mockResolvedValue(mockBroadcast as any);

      const result = await controller.createBroadcast(dto);

      expect(result).toEqual(mockBroadcast);
      expect(service.createBroadcast).toHaveBeenCalledWith(dto);
    });
  });

  describe('getBroadcasts', () => {
    it('should get broadcast notifications with query parameters', async () => {
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

      jest.spyOn(service, 'getBroadcasts').mockResolvedValue(mockResult as any);

      const result = await controller.getBroadcasts(query);

      expect(result).toEqual(mockResult);
      expect(service.getBroadcasts).toHaveBeenCalledWith(query);
    });

    it('should get broadcast notifications without query parameters', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC' as const };

      const mockResult = {
        result: [mockBroadcast],
        metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest.spyOn(service, 'getBroadcasts').mockResolvedValue(mockResult as any);

      const result = await controller.getBroadcasts(query);

      expect(result).toEqual(mockResult);
      expect(service.getBroadcasts).toHaveBeenCalledWith(query);
    });
  });

  describe('getActiveBroadcasts', () => {
    it('should get active broadcast notifications', async () => {
      const mockBroadcasts = [mockBroadcast];

      jest
        .spyOn(service, 'getActiveBroadcasts')
        .mockResolvedValue(mockBroadcasts as any);

      const result = await controller.getActiveBroadcasts();

      expect(result).toEqual(mockBroadcasts);
      expect(service.getActiveBroadcasts).toHaveBeenCalled();
    });
  });

  describe('getBroadcastStats', () => {
    it('should get broadcast notification statistics', async () => {
      const mockStats = {
        total: 100,
        active: 50,
        expired: 30,
        byType: { system_announcement: 40, maintenance: 60 },
        byPriority: { high: 20, normal: 80 },
      };

      jest.spyOn(service, 'getBroadcastStats').mockResolvedValue(mockStats);

      const result = await controller.getBroadcastStats();

      expect(result).toEqual(mockStats);
      expect(service.getBroadcastStats).toHaveBeenCalled();
    });
  });

  describe('getBroadcast', () => {
    it('should get a specific broadcast notification by id', async () => {
      const broadcastId = '1234567890123456789';

      jest.spyOn(service, 'findById').mockResolvedValue(mockBroadcast as any);

      const result = await controller.getBroadcast(broadcastId);

      expect(result).toEqual(mockBroadcast);
      expect(service.findById).toHaveBeenCalledWith(broadcastId);
    });
  });

  describe('updateBroadcast', () => {
    it('should update a broadcast notification', async () => {
      const broadcastId = '1234567890123456789';
      const dto = {
        title: 'Updated Maintenance Notice',
        isActive: false,
      };

      const updatedBroadcast = { ...mockBroadcast, ...dto };

      jest
        .spyOn(service, 'updateBroadcast')
        .mockResolvedValue(updatedBroadcast as any);

      const result = await controller.updateBroadcast(broadcastId, dto);

      expect(result).toEqual(updatedBroadcast);
      expect(service.updateBroadcast).toHaveBeenCalledWith(broadcastId, dto);
    });
  });

  describe('deleteBroadcast', () => {
    it('should delete a broadcast notification', async () => {
      const broadcastId = '1234567890123456789';

      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.deleteBroadcast(broadcastId);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(broadcastId);
    });
  });

  describe('deactivateExpiredBroadcasts', () => {
    it('should deactivate expired broadcast notifications', async () => {
      const mockResult = { deactivated: 5 };

      jest
        .spyOn(service, 'deactivateExpiredBroadcasts')
        .mockResolvedValue(mockResult);

      const result = await controller.deactivateExpiredBroadcasts();

      expect(result).toEqual(mockResult);
      expect(service.deactivateExpiredBroadcasts).toHaveBeenCalled();
    });
  });
});
