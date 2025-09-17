import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthPayload } from 'src/common/interface';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockUser: AuthPayload = {
    uid: '9876543210987654321',
    ssid: 'test-session-id',
    role: 'user',
  };

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
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
            createBulkNotifications: jest.fn(),
            getUserNotifications: jest.fn(),
            getUserNotificationsWithBroadcasts: jest.fn(),
            getUserNotificationStats: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            createPreference: jest.fn(),
            updatePreference: jest.fn(),
            bulkUpdatePreferences: jest.fn(),
            getUserPreferences: jest.fn(),
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

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const dto = {
        userId: '9876543210987654321',
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        title: 'Your article was liked!',
        message: 'John Doe liked your article',
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
      };

      jest
        .spyOn(service, 'createNotification')
        .mockResolvedValue(mockNotification as any);

      const result = await controller.createNotification(dto, {
        user: mockUser,
      } as any);

      expect(result).toEqual(mockNotification);
      expect(service.createNotification).toHaveBeenCalledWith(
        mockUser.uid,
        dto,
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

      const mockResult = { created: 2, skipped: 0 };

      jest
        .spyOn(service, 'createBulkNotifications')
        .mockResolvedValue(mockResult);

      const result = await controller.createBulkNotifications(dto);

      expect(result).toEqual(mockResult);
      expect(service.createBulkNotifications).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with query parameters', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
        isRead: false,
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
      };

      const mockResult = {
        result: [mockNotification],
        metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      jest
        .spyOn(service, 'getUserNotifications')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getUserNotifications(query, {
        user: mockUser,
      } as any);

      expect(result).toEqual(mockResult);
      expect(service.getUserNotifications).toHaveBeenCalledWith(
        mockUser.uid,
        query,
      );
    });
  });

  describe('getUserNotificationsWithBroadcasts', () => {
    it('should get user notifications with broadcasts', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC' as const };

      const mockResult = {
        notifications: {
          result: [mockNotification],
          metaData: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        broadcasts: [],
      };

      jest
        .spyOn(service, 'getUserNotificationsWithBroadcasts')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getUserNotificationsWithBroadcasts(
        query,
        { user: mockUser } as any,
      );

      expect(result).toEqual(mockResult);
      expect(service.getUserNotificationsWithBroadcasts).toHaveBeenCalledWith(
        mockUser.uid,
        query,
      );
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics for user', async () => {
      const mockStats = {
        total: 100,
        unread: 25,
        byType: { article_liked: 50, article_commented: 30 },
        byStatus: { sent: 80, pending: 20 },
      };

      jest
        .spyOn(service, 'getUserNotificationStats')
        .mockResolvedValue(mockStats);

      const result = await controller.getNotificationStats({
        user: mockUser,
      } as any);

      expect(result).toEqual(mockStats);
      expect(service.getUserNotificationStats).toHaveBeenCalledWith(
        mockUser.uid,
      );
    });
  });

  describe('getNotification', () => {
    it('should get a specific notification by id', async () => {
      const notificationId = '1234567890123456789';

      jest.spyOn(service, 'findOne').mockResolvedValue(mockNotification as any);

      const result = await controller.getNotification(notificationId, {
        user: mockUser,
      } as any);

      expect(result).toEqual(mockNotification);
      expect(service.findOne).toHaveBeenCalledWith(
        { id: notificationId, userId: mockUser.uid },
        { relations: ['user'] },
      );
    });
  });

  describe('updateNotification', () => {
    it('should update a notification', async () => {
      const notificationId = '1234567890123456789';
      const dto = {
        status: NOTIFICATION_CONSTANTS.STATUS.SENT,
        isRead: true,
      };

      const updatedNotification = { ...mockNotification, ...dto };

      jest
        .spyOn(service, 'update')
        .mockResolvedValue(updatedNotification as any);

      const result = await controller.updateNotification(notificationId, dto, {
        user: mockUser,
      } as any);

      expect(result).toEqual(updatedNotification);
      expect(service.update).toHaveBeenCalledWith(notificationId, dto);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = '1234567890123456789';
      const dto = { isRead: true, readAt: '2024-01-01T00:00:00Z' };

      const updatedNotification = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(dto.readAt),
      };

      jest
        .spyOn(service, 'markAsRead')
        .mockResolvedValue(updatedNotification as any);

      const result = await controller.markAsRead(notificationId, dto, {
        user: mockUser,
      } as any);

      expect(result).toEqual(updatedNotification);
      expect(service.markAsRead).toHaveBeenCalledWith(
        notificationId,
        mockUser.uid,
        dto,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const mockResult = { count: 5 };

      jest.spyOn(service, 'markAllAsRead').mockResolvedValue(mockResult);

      const result = await controller.markAllAsRead({ user: mockUser } as any);

      expect(result).toEqual(mockResult);
      expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.uid);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notificationId = '1234567890123456789';

      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.deleteNotification(notificationId, {
        user: mockUser,
      } as any);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(notificationId);
    });
  });

  describe('preference endpoints', () => {
    describe('getUserPreferences', () => {
      it('should get user notification preferences', async () => {
        const mockPreferences = [mockPreference];

        jest
          .spyOn(service, 'getUserPreferences')
          .mockResolvedValue(mockPreferences as any);

        const result = await controller.getUserPreferences({
          user: mockUser,
        } as any);

        expect(result).toEqual(mockPreferences);
        expect(service.getUserPreferences).toHaveBeenCalledWith(mockUser.uid);
      });
    });

    describe('createPreference', () => {
      it('should create a notification preference', async () => {
        const dto = {
          type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
          channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
          enabled: true,
        };

        jest
          .spyOn(service, 'createPreference')
          .mockResolvedValue(mockPreference as any);

        const result = await controller.createPreference(dto, {
          user: mockUser,
        } as any);

        expect(result).toEqual(mockPreference);
        expect(service.createPreference).toHaveBeenCalledWith(
          mockUser.uid,
          dto,
        );
      });
    });

    describe('updatePreference', () => {
      it('should update a notification preference', async () => {
        const preferenceId = '1111111111111111111';
        const dto = { enabled: false };

        const updatedPreference = { ...mockPreference, enabled: false };

        jest
          .spyOn(service, 'updatePreference')
          .mockResolvedValue(updatedPreference as any);

        const result = await controller.updatePreference(preferenceId, dto, {
          user: mockUser,
        } as any);

        expect(result).toEqual(updatedPreference);
        expect(service.updatePreference).toHaveBeenCalledWith(
          preferenceId,
          mockUser.uid,
          dto,
        );
      });
    });

    describe('bulkUpdatePreferences', () => {
      it('should bulk update notification preferences', async () => {
        const dto = {
          preferences: [
            {
              type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
              channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
              enabled: false,
            },
          ],
        };

        const mockResult = { updated: 1, created: 0 };

        jest
          .spyOn(service, 'bulkUpdatePreferences')
          .mockResolvedValue(mockResult);

        const result = await controller.bulkUpdatePreferences(dto, {
          user: mockUser,
        } as any);

        expect(result).toEqual(mockResult);
        expect(service.bulkUpdatePreferences).toHaveBeenCalledWith(
          mockUser.uid,
          dto,
        );
      });
    });

    describe('deletePreference', () => {
      it('should delete a notification preference', async () => {
        const preferenceId = '1111111111111111111';

        jest.spyOn(service, 'remove').mockResolvedValue(undefined);

        const result = await controller.deletePreference(preferenceId, {
          user: mockUser,
        } as any);

        expect(result).toBeUndefined();
        expect(service.remove).toHaveBeenCalledWith(preferenceId);
      });
    });
  });
});
