import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { Notification, NotificationPreference } from './entities';
import { CacheService } from 'src/shared/services';
import { RabbitMQService } from 'src/shared/services/rabbitmq/rabbitmq.service';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let cacheService: CacheService;
  let rabbitMQService: RabbitMQService;
  let preferenceService: NotificationPreferenceService;

  const mockNotification = {
    id: '1234567890123456789',
    userId: '9876543210987654321',
    type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
    title: 'Your article was liked!',
    message: 'John Doe liked your article "Getting Started with NestJS"',
    status: NOTIFICATION_CONSTANTS.STATUS.PENDING,
    priority: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
    channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    markAsRead: jest.fn(),
  };

  const mockPreference = {
    id: '1111111111111111111',
    userId: '9876543210987654321',
    type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
    channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
    enabled: true,
    batched: false,
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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
          provide: getRepositoryToken(NotificationPreference),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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
        {
          provide: RabbitMQService,
          useValue: {
            sendDataToRabbitMQAsync: jest.fn(),
          },
        },
        {
          provide: NotificationPreferenceService,
          useValue: {
            shouldSendNotification: jest.fn(),
            createPreference: jest.fn(),
            updatePreference: jest.fn(),
            bulkUpdatePreferences: jest.fn(),
            getUserPreferences: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    cacheService = module.get<CacheService>(CacheService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
    preferenceService = module.get<NotificationPreferenceService>(
      NotificationPreferenceService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        title: 'Your article was liked!',
        message: 'John Doe liked your article',
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
      };

      jest
        .spyOn(preferenceService, 'shouldSendNotification')
        .mockResolvedValue(true);
      jest.spyOn(service, 'create').mockResolvedValue(mockNotification as any);
      jest
        .spyOn(rabbitMQService, 'sendDataToRabbitMQAsync')
        .mockResolvedValue(true);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.createNotification(userId, dto);

      expect(result).toEqual(mockNotification);
      expect(preferenceService.shouldSendNotification).toHaveBeenCalledWith(
        userId,
        dto.type,
        dto.channel,
      );
      expect(service.create).toHaveBeenCalled();
      expect(rabbitMQService.sendDataToRabbitMQAsync).toHaveBeenCalled();
    });

    it('should return null when user preferences block notification', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        title: 'Your article was liked!',
        message: 'John Doe liked your article',
      };

      jest
        .spyOn(preferenceService, 'shouldSendNotification')
        .mockResolvedValue(false);

      const result = await service.createNotification(userId, dto);

      expect(result).toBeNull();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('should handle errors during notification creation', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        title: 'Your article was liked!',
        message: 'John Doe liked your article',
      };

      jest
        .spyOn(preferenceService, 'shouldSendNotification')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createNotification(userId, dto)).rejects.toThrow(
        'Internal Server Error',
      );
    });
  });

  describe('createBulkNotifications', () => {
    it('should create bulk notifications successfully', async () => {
      const dto = {
        userIds: ['1111111111111111111', '2222222222222222222'],
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
        title: 'System Maintenance',
        message: 'We will perform maintenance',
      };

      jest
        .spyOn(service, 'createNotification')
        .mockResolvedValue(mockNotification as any);

      const result = await service.createBulkNotifications(dto);

      expect(result).toEqual({ created: 2, skipped: 0 });
      expect(service.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk creation', async () => {
      const dto = {
        userIds: ['1111111111111111111', '2222222222222222222'],
        type: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
        title: 'System Maintenance',
        message: 'We will perform maintenance',
      };

      jest
        .spyOn(service, 'createNotification')
        .mockResolvedValueOnce(mockNotification as any)
        .mockResolvedValueOnce(null);

      const result = await service.createBulkNotifications(dto);

      expect(result).toEqual({ created: 1, skipped: 1 });
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const userId = '9876543210987654321';
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
        isRead: false,
      };

      const mockResult = {
        result: [mockNotification],
        metaData: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockResult as any);

      const result = await service.getUserNotifications(userId, query);

      expect(result).toEqual(mockResult);
      expect(service.listOffset).toHaveBeenCalledWith(
        query,
        { userId, isRead: false },
        { relations: ['user'] },
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = '1234567890123456789';
      const userId = '9876543210987654321';
      const dto = { isRead: true };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockNotification as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);
      jest.spyOn(notificationRepository, 'save').mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: expect.any(Date),
      } as any);

      const result = await service.markAsRead(notificationId, userId, dto);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockNotification.markAsRead).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should throw error when notification not found', async () => {
      const notificationId = '1234567890123456789';
      const userId = '9876543210987654321';

      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(
        service.markAsRead(notificationId, userId),
      ).rejects.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const userId = '9876543210987654321';

      jest.spyOn(notificationRepository, 'update').mockResolvedValue({
        affected: 5,
      } as any);

      const result = await service.markAllAsRead(userId);

      expect(result).toEqual({ count: 5 });
      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId, isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
    });
  });

  describe('getUserNotificationStats', () => {
    it('should return notification statistics', async () => {
      const userId = '9876543210987654321';

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(notificationRepository, 'count').mockResolvedValue(100);
      jest.spyOn(notificationRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { type: 'article_liked', count: '50' },
            { type: 'article_commented', count: '30' },
          ])
          .mockResolvedValueOnce([
            { status: 'sent', count: '80' },
            { status: 'pending', count: '20' },
          ]),
      } as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getUserNotificationStats(userId);

      expect(result).toEqual({
        total: 100,
        unread: 100,
        byType: {
          article_liked: 50,
          article_commented: 30,
        },
        byStatus: {
          sent: 80,
          pending: 20,
        },
      });
    });

    it('should return cached statistics when available', async () => {
      const userId = '9876543210987654321';
      const cachedStats = {
        total: 50,
        unread: 10,
        byType: { article_liked: 30 },
        byStatus: { sent: 40 },
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedStats);

      const result = await service.getUserNotificationStats(userId);

      expect(result).toEqual(cachedStats);
      expect(notificationRepository.count).not.toHaveBeenCalled();
    });
  });

  describe('preference methods', () => {
    it('should delegate preference creation to preference service', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        enabled: true,
      };

      jest
        .spyOn(preferenceService, 'createPreference')
        .mockResolvedValue(mockPreference as any);

      const result = await service.createPreference(userId, dto);

      expect(result).toEqual(mockPreference);
      expect(preferenceService.createPreference).toHaveBeenCalledWith(
        userId,
        dto,
      );
    });

    it('should delegate preference update to preference service', async () => {
      const preferenceId = '1111111111111111111';
      const userId = '9876543210987654321';
      const dto = { enabled: false };

      jest
        .spyOn(preferenceService, 'updatePreference')
        .mockResolvedValue({ ...mockPreference, enabled: false } as any);

      const result = await service.updatePreference(preferenceId, userId, dto);

      expect(result.enabled).toBe(false);
      expect(preferenceService.updatePreference).toHaveBeenCalledWith(
        preferenceId,
        userId,
        dto,
      );
    });

    it('should delegate bulk preference update to preference service', async () => {
      const userId = '9876543210987654321';
      const dto = {
        preferences: [
          {
            type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
            channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
            enabled: false,
          },
        ],
      };

      jest
        .spyOn(preferenceService, 'bulkUpdatePreferences')
        .mockResolvedValue({ updated: 1, created: 0 });

      const result = await service.bulkUpdatePreferences(userId, dto);

      expect(result).toEqual({ updated: 1, created: 0 });
      expect(preferenceService.bulkUpdatePreferences).toHaveBeenCalledWith(
        userId,
        dto,
      );
    });

    it('should delegate get user preferences to preference service', async () => {
      const userId = '9876543210987654321';

      jest
        .spyOn(preferenceService, 'getUserPreferences')
        .mockResolvedValue([mockPreference] as any);

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual([mockPreference]);
      expect(preferenceService.getUserPreferences).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserNotificationsWithBroadcasts', () => {
    it('should return notifications and broadcasts', async () => {
      const userId = '9876543210987654321';
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
      };

      const mockNotifications = {
        result: [mockNotification],
        metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest
        .spyOn(service, 'getUserNotifications')
        .mockResolvedValue(mockNotifications as any);

      const result = await service.getUserNotificationsWithBroadcasts(
        userId,
        query,
      );

      expect(result).toEqual({
        notifications: mockNotifications,
        broadcasts: [],
      });
    });
  });
});
