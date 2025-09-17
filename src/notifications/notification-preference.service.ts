import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { NotificationPreference } from './entities';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  BulkUpdateNotificationPreferencesDto,
} from './dto';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationChannel,
} from 'src/shared/constants';

@Injectable()
export class NotificationPreferenceService extends BaseService<NotificationPreference> {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,

    protected readonly cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<NotificationPreference>(preferenceRepository),
      {
        entityName: 'NotificationPreference',
        cache: {
          enabled: true,
          ttlSec: NOTIFICATION_CONSTANTS.CACHE.TTL,
          prefix: 'notification_preferences',
          swrSec: NOTIFICATION_CONSTANTS.CACHE.SWR_SEC,
        },
        defaultSearchField: 'type',
        relationsWhitelist: {
          user: true,
        },
        emitEvents: false,
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof NotificationPreference)[] {
    return ['type', 'channel'];
  }

  /**
   * Create notification preference
   */
  async createPreference(
    userId: string,
    dto: CreateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    try {
      // Check if preference already exists
      const existing = await this.preferenceRepository.findOne({
        where: { userId, type: dto.type, channel: dto.channel },
      });

      if (existing) {
        throw new HttpException(
          { messageKey: 'notification.PREFERENCE_ALREADY_EXISTS' },
          HttpStatus.CONFLICT,
        );
      }

      const preference = this.preferenceRepository.create({
        ...dto,
        userId,
        timezone: dto.timezone || 'UTC',
      });

      const saved = await this.preferenceRepository.save(preference);

      // Invalidate user preferences cache
      await this.invalidateUserPreferencesCache(userId);

      this.logger.log(
        `Notification preference created: ${saved?.id}, user: ${userId}, type: ${dto.type}`,
      );

      return saved;
    } catch (error) {
      this.logger.error('Failed to create notification preference:', error);
      throw error;
    }
  }

  /**
   * Update notification preference
   */
  async updatePreference(
    preferenceId: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { id: preferenceId, userId },
      });

      if (!preference) {
        throw new HttpException(
          { messageKey: 'notification.PREFERENCE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      Object.assign(preference, dto);
      const updated = await this.preferenceRepository.save(preference);

      // Invalidate user preferences cache
      await this.invalidateUserPreferencesCache(userId);

      this.logger.log(`Notification preference updated: ${preferenceId}`);

      return updated;
    } catch (error) {
      this.logger.error('Failed to update notification preference:', error);
      throw error;
    }
  }

  /**
   * Bulk update notification preferences
   */
  async bulkUpdatePreferences(
    userId: string,
    dto: BulkUpdateNotificationPreferencesDto,
  ): Promise<{ updated: number; created: number }> {
    let updated = 0;
    let created = 0;

    try {
      for (const pref of dto.preferences) {
        const existing = await this.preferenceRepository.findOne({
          where: { userId, type: pref.type, channel: pref.channel },
        });

        if (existing) {
          Object.assign(existing, pref);
          await this.preferenceRepository.save(existing);
          updated++;
        } else {
          const newPreference = this.preferenceRepository.create({
            ...pref,
            userId,
            timezone: pref.timezone || 'UTC',
          });
          await this.preferenceRepository.save(newPreference);
          created++;
        }
      }

      // Invalidate user preferences cache
      await this.invalidateUserPreferencesCache(userId);

      this.logger.log(
        `Bulk preferences updated: ${updated} updated, ${created} created`,
      );

      return { updated, created };
    } catch (error) {
      this.logger.error('Failed to bulk update preferences:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      // Check cache first
      const cacheKey = `notification_preferences:${userId}`;
      const cached = await this.cacheService?.get(cacheKey);
      if (cached) {
        this.logger.debug(`User preferences cache hit for user ${userId}`);
        return cached as NotificationPreference[];
      }

      const preferences = await this.preferenceRepository.find({
        where: { userId },
        order: { type: 'ASC', channel: 'ASC' },
      });

      // Cache the result for 10 minutes
      await this.cacheService?.set(cacheKey, preferences, 600);

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences as a map for quick lookup
   */
  async getUserPreferencesMap(
    userId: string,
  ): Promise<Map<string, NotificationPreference>> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const preferenceMap = new Map<string, NotificationPreference>();

      preferences.forEach((preference) => {
        const key = `${preference.type}-${preference.channel}`;
        preferenceMap.set(key, preference);
      });

      return preferenceMap;
    } catch (error) {
      this.logger.error('Failed to get user preferences map:', error);
      throw error;
    }
  }

  /**
   * Check if user has preference for specific type and channel
   */
  async hasPreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { userId, type, channel },
      });

      return !!preference;
    } catch (error) {
      this.logger.error('Failed to check if preference exists:', error);
      return false;
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    date: Date = new Date(),
  ): Promise<boolean> {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { userId, type, channel },
      });

      if (!preference) {
        // Default to enabled if no preference exists
        return true;
      }

      return preference.shouldSend(date);
    } catch (error) {
      this.logger.error('Failed to check user preferences:', error);
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Get default preferences for a user
   * Creates default preferences for all notification types and channels
   */
  async createDefaultPreferences(
    userId: string,
  ): Promise<NotificationPreference[]> {
    try {
      const defaultPreferences: CreateNotificationPreferenceDto[] = [];

      // Create preferences for all notification types and channels
      Object.values(NOTIFICATION_CONSTANTS.TYPES).forEach((type) => {
        Object.values(NOTIFICATION_CONSTANTS.CHANNEL).forEach((channel) => {
          defaultPreferences.push({
            type,
            channel,
            enabled: true,
            batched: false,
            timezone: 'UTC',
          });
        });
      });

      const createdPreferences: NotificationPreference[] = [];

      for (const pref of defaultPreferences) {
        try {
          const preference = await this.createPreference(userId, pref);
          createdPreferences.push(preference);
        } catch (error) {
          // Skip if preference already exists
          if (
            error instanceof HttpException &&
            error.getStatus() === HttpStatus.CONFLICT
          ) {
            this.logger.debug(
              `Preference already exists: ${pref.type}-${pref.channel}`,
            );
            continue;
          }
          throw error;
        }
      }

      this.logger.log(
        `Created ${createdPreferences.length} default preferences for user ${userId}`,
      );

      return createdPreferences;
    } catch (error) {
      this.logger.error('Failed to create default preferences:', error);
      throw error;
    }
  }

  /**
   * Delete all preferences for a user
   */
  async deleteUserPreferences(userId: string): Promise<{ count: number }> {
    try {
      const result = await this.preferenceRepository.delete({ userId });

      // Invalidate user preferences cache
      await this.invalidateUserPreferencesCache(userId);

      this.logger.log(
        `Deleted ${result.affected} preferences for user ${userId}`,
      );

      return { count: result.affected || 0 };
    } catch (error) {
      this.logger.error('Failed to delete user preferences:', error);
      throw error;
    }
  }

  /**
   * Invalidate user preferences cache
   */
  private async invalidateUserPreferencesCache(userId: string): Promise<void> {
    try {
      const cacheKey = `notification_preferences:${userId}`;
      await this.cacheService?.delete(cacheKey);
      this.logger.debug(
        `Invalidated user preferences cache for user ${userId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate preferences cache for user ${userId}:`,
        error,
      );
    }
  }
}
