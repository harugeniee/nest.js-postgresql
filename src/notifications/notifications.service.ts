import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { RabbitMQService } from 'src/shared/services/rabbitmq/rabbitmq.service';
import { IPagination } from 'src/common/interface';
import { Notification, NotificationPreference } from './entities';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  QueryNotificationsDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  BulkUpdateNotificationPreferencesDto,
  MarkAsReadDto,
} from './dto';
import {
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_JOB_NAMES,
  NotificationType,
  NotificationChannel,
} from 'src/shared/constants';

@Injectable()
export class NotificationsService extends BaseService<Notification> {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,

    protected readonly cacheService: CacheService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    super(
      new TypeOrmBaseRepository<Notification>(notificationRepository),
      {
        entityName: 'Notification',
        cache: {
          enabled: true,
          ttlSec: NOTIFICATION_CONSTANTS.CACHE.TTL,
          prefix: NOTIFICATION_CONSTANTS.CACHE.PREFIX,
          swrSec: NOTIFICATION_CONSTANTS.CACHE.SWR_SEC,
        },
        defaultSearchField: 'title',
        relationsWhitelist: {
          user: true,
        },
        emitEvents: false, // Use RabbitMQ instead
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof Notification)[] {
    return ['title', 'message'];
  }

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    dto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<Notification | null> {
    try {
      // Check user preferences
      const shouldSend = await this.checkUserPreferences(
        userId,
        dto.type,
        dto.channel || NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
      );

      if (!shouldSend) {
        this.logger.debug(
          `Notification blocked by user preferences: ${userId}, ${dto.type}`,
        );
        return null;
      }

      // Create notification entity
      const notification = await this.create({
        ...dto,
        userId,
        channel: dto.channel || NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
        priority: dto.priority || NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
        status: NOTIFICATION_CONSTANTS.STATUS.PENDING,
        maxRetries: dto.maxRetries || NOTIFICATION_CONSTANTS.MAX_RETRIES,
      });

      // Send to queue for processing
      await this.sendToQueue(notification);

      this.logger.log(
        `Notification created and queued: ${notification.id}, type: ${dto.type}`,
      );

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications
   */
  async createBulkNotifications(
    dto: CreateBulkNotificationDto,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    try {
      // Process in batches to avoid overwhelming the system
      const batchSize = NOTIFICATION_CONSTANTS.BATCH_SIZE;
      const batches = this.chunkArray(dto.userIds, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (userId) => {
          try {
            const notification = await this.createNotification(userId, {
              ...dto,
            });
            return notification ? 1 : 0;
          } catch (error) {
            this.logger.error(
              `Failed to create notification for user ${userId}:`,
              error,
            );
            return 0;
          }
        });

        const results = await Promise.allSettled(batchPromises);
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            created += result.value;
            skipped += 1 - result.value;
          } else {
            skipped++;
          }
        });

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(100);
        }
      }

      this.logger.log(
        `Bulk notifications created: ${created} created, ${skipped} skipped`,
      );

      return { created, skipped };
    } catch (error) {
      this.logger.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<IPagination<Notification>> {
    try {
      const where: FindOptionsWhere<Notification> = { userId };

      // Apply filters
      if (query.type) where.type = query.type;
      if (query.status) where.status = query.status;
      if (query.priority) where.priority = query.priority;
      if (query.channel) where.channel = query.channel;
      if (query.isRead !== undefined) where.isRead = query.isRead;
      if (query.relatedEntityType)
        where.relatedEntityType = query.relatedEntityType;
      if (query.relatedEntityId) where.relatedEntityId = query.relatedEntityId;

      // Date range filter
      if (query.startDate || query.endDate) {
        const startDate = query.startDate
          ? new Date(query.startDate)
          : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;
        where.createdAt = Between(
          startDate || new Date(0),
          endDate || new Date(),
        );
      }

      // Use findAndCount from BaseService
      const [notifications, total] = await this.repo.findAndCount({
        where,
        relations: ['user'],
        order: { [query.sortBy || 'createdAt']: query.sortOrder || 'DESC' },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      });

      return {
        result: notifications,
        metaData: {
          currentPage: query.page || 1,
          pageSize: query.limit || 20,
          totalRecords: total,
          totalPages: Math.ceil(total / (query.limit || 20)),
          hasNextPage:
            (query.page || 1) < Math.ceil(total / (query.limit || 20)),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    dto: MarkAsReadDto = {},
  ): Promise<Notification> {
    try {
      const notification = await this.repo.findOne(
        { id: notificationId, userId },
        { relations: ['user'] },
      );

      if (!notification) {
        throw new HttpException(
          { messageKey: 'notification.NOTIFICATION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (dto.isRead !== false) {
        notification.markAsRead();
        if (dto.readAt) {
          notification.readAt = new Date(dto.readAt);
        }
      }

      const updated = await this.repo.save(notification);

      this.logger.log(`Notification marked as read: ${notificationId}`);

      return updated;
    } catch (error) {
      this.logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      const result = await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      this.logger.log(
        `Marked ${result.affected} notifications as read for user ${userId}`,
      );

      return { count: result.affected || 0 };
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const [total, unread, byTypeRaw, byStatusRaw] = await Promise.all([
        this.notificationRepository.count({ where: { userId } }),
        this.notificationRepository.count({ where: { userId, isRead: false } }),
        this.notificationRepository
          .createQueryBuilder('notification')
          .select('notification.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .where('notification.userId = :userId', { userId })
          .groupBy('notification.type')
          .getRawMany(),
        this.notificationRepository
          .createQueryBuilder('notification')
          .select('notification.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .where('notification.userId = :userId', { userId })
          .groupBy('notification.status')
          .getRawMany(),
      ]);

      const byType = byTypeRaw as { type: string; count: string }[];
      const byStatus = byStatusRaw as { status: string; count: string }[];

      const byTypeMap = byType.reduce(
        (
          acc: Record<string, number>,
          item: { type: string; count: string },
        ) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        },
        {},
      );

      const byStatusMap = byStatus.reduce(
        (
          acc: Record<string, number>,
          item: { status: string; count: string },
        ) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        },
        {},
      );

      return {
        total,
        unread,
        byType: byTypeMap,
        byStatus: byStatusMap,
      };
    } catch (error) {
      this.logger.error('Failed to get notification stats:', error);
      throw error;
    }
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

      return await this.preferenceRepository.save(preference);
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
      return await this.preferenceRepository.save(preference);
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
      return await this.preferenceRepository.find({
        where: { userId },
        order: { type: 'ASC', channel: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Send notification to queue for processing
   */
  private async sendToQueue(notification: Notification): Promise<void> {
    try {
      const jobName = this.getJobNameForChannel(notification.channel);
      const jobData = {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        emailTemplate: notification.emailTemplate,
        emailTemplateData: notification.emailTemplateData,
        pushData: notification.pushData,
        metadata: notification.metadata,
        scheduledFor: notification.scheduledFor,
        maxRetries: notification.maxRetries,
      };

      await this.rabbitMQService.sendDataToRabbitMQAsync(jobName, jobData);

      this.logger.debug(
        `Notification queued: ${notification.id}, channel: ${notification.channel}`,
      );
    } catch (error) {
      this.logger.error('Failed to send notification to queue:', error);
      throw error;
    }
  }

  /**
   * Get job name for notification channel
   */
  private getJobNameForChannel(channel: NotificationChannel): string {
    switch (channel) {
      case NOTIFICATION_CONSTANTS.CHANNEL.EMAIL:
        return NOTIFICATION_JOB_NAMES.SEND_EMAIL;
      case NOTIFICATION_CONSTANTS.CHANNEL.PUSH:
        return NOTIFICATION_JOB_NAMES.SEND_PUSH;
      case NOTIFICATION_CONSTANTS.CHANNEL.IN_APP:
        return NOTIFICATION_JOB_NAMES.SEND_IN_APP;
      case NOTIFICATION_CONSTANTS.CHANNEL.SMS:
        return NOTIFICATION_JOB_NAMES.SEND_SMS;
      default:
        return NOTIFICATION_JOB_NAMES.SEND_EMAIL;
    }
  }

  /**
   * Check user preferences for notification type and channel
   */
  private async checkUserPreferences(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      const preference = await this.preferenceRepository.findOne({
        where: { userId, type, channel },
      });

      if (!preference) {
        // Default to enabled if no preference exists
        return true;
      }

      return preference.shouldSend();
    } catch (error) {
      this.logger.error('Failed to check user preferences:', error);
      // Default to enabled on error
      return true;
    }
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
