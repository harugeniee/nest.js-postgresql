import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationPreference } from './entities';
import { CacheService } from 'src/shared/services';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let preferenceRepository: Repository<NotificationPreference>;
  let cacheService: CacheService;

  const mockPreference = {
    id: '1111111111111111111',
    userId: '9876543210987654321',
    type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
    channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
    enabled: true,
    batched: false,
    batchFrequency: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferenceService,
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
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

    service = module.get<NotificationPreferenceService>(
      NotificationPreferenceService,
    );
    preferenceRepository = module.get<Repository<NotificationPreference>>(
      getRepositoryToken(NotificationPreference),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPreference', () => {
    it('should create a new preference successfully', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        enabled: true,
        timezone: 'UTC',
      };

      jest.spyOn(preferenceRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(preferenceRepository, 'create')
        .mockReturnValue(mockPreference as any);
      jest.spyOn(preferenceRepository, 'save').mockResolvedValue({
        ...mockPreference,
        id: '1111111111111111111',
      } as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.createPreference(userId, dto);

      expect(result).toEqual(mockPreference);
      expect(preferenceRepository.findOne).toHaveBeenCalledWith({
        where: { userId, type: dto.type, channel: dto.channel },
      });
      expect(preferenceRepository.create).toHaveBeenCalledWith({
        ...dto,
        userId,
        timezone: 'UTC',
      });
      expect(preferenceRepository.save).toHaveBeenCalled();
    });

    it('should throw conflict error when preference already exists', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        enabled: true,
      };

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockResolvedValue(mockPreference as any);

      await expect(service.createPreference(userId, dto)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle errors during preference creation', async () => {
      const userId = '9876543210987654321';
      const dto = {
        type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
        channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        enabled: true,
      };

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createPreference(userId, dto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('updatePreference', () => {
    it('should update preference successfully', async () => {
      const preferenceId = '1111111111111111111';
      const userId = '9876543210987654321';
      const dto = { enabled: false };

      const updatedPreference = { ...mockPreference, enabled: false };

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockResolvedValue(mockPreference as any);
      jest
        .spyOn(preferenceRepository, 'save')
        .mockResolvedValue(updatedPreference as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.updatePreference(preferenceId, userId, dto);

      expect(result).toEqual(updatedPreference);
      expect(preferenceRepository.findOne).toHaveBeenCalledWith({
        where: { id: preferenceId, userId },
      });
      expect(preferenceRepository.save).toHaveBeenCalled();
    });

    it('should throw not found error when preference does not exist', async () => {
      const preferenceId = '1111111111111111111';
      const userId = '9876543210987654321';
      const dto = { enabled: false };

      jest.spyOn(preferenceRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updatePreference(preferenceId, userId, dto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('bulkUpdatePreferences', () => {
    it('should bulk update preferences successfully', async () => {
      const userId = '9876543210987654321';
      const dto = {
        preferences: [
          {
            type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
            channel: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
            enabled: false,
          },
          {
            type: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_COMMENTED,
            channel: NOTIFICATION_CONSTANTS.CHANNEL.PUSH,
            enabled: true,
          },
        ],
      };

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockResolvedValueOnce(mockPreference as any) // First preference exists
        .mockResolvedValueOnce(null); // Second preference doesn't exist
      jest
        .spyOn(preferenceRepository, 'save')
        .mockResolvedValue(mockPreference as any);
      jest
        .spyOn(preferenceRepository, 'create')
        .mockReturnValue(mockPreference as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.bulkUpdatePreferences(userId, dto);

      expect(result).toEqual({ updated: 1, created: 1 });
      expect(preferenceRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences from cache', async () => {
      const userId = '9876543210987654321';
      const cachedPreferences = [mockPreference];

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedPreferences);

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual(cachedPreferences);
      expect(preferenceRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch and cache user preferences when not in cache', async () => {
      const userId = '9876543210987654321';
      const preferences = [mockPreference];

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest
        .spyOn(preferenceRepository, 'find')
        .mockResolvedValue(preferences as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual(preferences);
      expect(preferenceRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { type: 'ASC', channel: 'ASC' },
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        `notification_preferences:${userId}`,
        preferences,
        600,
      );
    });
  });

  describe('getUserPreferencesMap', () => {
    it('should return user preferences as a map', async () => {
      const userId = '9876543210987654321';
      const preferences = [mockPreference];

      jest
        .spyOn(service, 'getUserPreferences')
        .mockResolvedValue(preferences as any);

      const result = await service.getUserPreferencesMap(userId);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.get('article_liked-email')).toEqual(mockPreference);
    });
  });

  describe('hasPreference', () => {
    it('should return true when preference exists', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockResolvedValue(mockPreference as any);

      const result = await service.hasPreference(userId, type, channel);

      expect(result).toBe(true);
      expect(preferenceRepository.findOne).toHaveBeenCalledWith({
        where: { userId, type, channel },
      });
    });

    it('should return false when preference does not exist', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      jest.spyOn(preferenceRepository, 'findOne').mockResolvedValue(null);

      const result = await service.hasPreference(userId, type, channel);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      const result = await service.hasPreference(userId, type, channel);

      expect(result).toBe(false);
    });
  });

  describe('shouldSendNotification', () => {
    it('should return true when preference allows notification', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;
      const date = new Date();

      const preference = {
        ...mockPreference,
        shouldSend: jest.fn().mockReturnValue(true),
      };

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockResolvedValue(preference as any);

      const result = await service.shouldSendNotification(
        userId,
        type,
        channel,
        date,
      );

      expect(result).toBe(true);
      expect(preference.shouldSend).toHaveBeenCalledWith(date);
    });

    it('should return true when no preference exists (default enabled)', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      jest.spyOn(preferenceRepository, 'findOne').mockResolvedValue(null);

      const result = await service.shouldSendNotification(
        userId,
        type,
        channel,
      );

      expect(result).toBe(true);
    });

    it('should return true on error (default enabled)', async () => {
      const userId = '9876543210987654321';
      const type = NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED;
      const channel = NOTIFICATION_CONSTANTS.CHANNEL.EMAIL;

      jest
        .spyOn(preferenceRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      const result = await service.shouldSendNotification(
        userId,
        type,
        channel,
      );

      expect(result).toBe(true);
    });
  });

  describe('createDefaultPreferences', () => {
    it('should create default preferences for all types and channels', async () => {
      const userId = '9876543210987654321';

      jest
        .spyOn(service, 'createPreference')
        .mockResolvedValue(mockPreference as any);

      const result = await service.createDefaultPreferences(userId);

      // Should create preferences for all combinations of types and channels
      const expectedCount =
        Object.keys(NOTIFICATION_CONSTANTS.TYPES).length *
        Object.keys(NOTIFICATION_CONSTANTS.CHANNEL).length;

      expect(result).toHaveLength(expectedCount);
      expect(service.createPreference).toHaveBeenCalledTimes(expectedCount);
    });

    it('should skip existing preferences during default creation', async () => {
      const userId = '9876543210987654321';

      // Mock createPreference to reject first call, resolve second call
      jest
        .spyOn(service, 'createPreference')
        .mockRejectedValueOnce(
          new HttpException('Conflict', HttpStatus.CONFLICT),
        )
        .mockResolvedValueOnce({
          ...mockPreference,
          id: '1111111111111111111',
        } as any);

      const result = await service.createDefaultPreferences(userId);

      // Should have created 1 preference (the second one that succeeded)
      expect(result).toHaveLength(1);
      expect(service.createPreference).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete all preferences for a user', async () => {
      const userId = '9876543210987654321';

      jest
        .spyOn(preferenceRepository, 'delete')
        .mockResolvedValue({ affected: 5 } as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);

      const result = await service.deleteUserPreferences(userId);

      expect(result).toEqual({ count: 5 });
      expect(preferenceRepository.delete).toHaveBeenCalledWith({ userId });
    });
  });
});
