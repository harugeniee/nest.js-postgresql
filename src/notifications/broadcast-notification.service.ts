import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, MoreThan } from 'typeorm';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { CacheService } from 'src/shared/services';
import { IPagination } from 'src/common/interface';
import { BroadcastNotification } from './entities/broadcast-notification.entity';
import {
  CreateBroadcastNotificationDto,
  UpdateBroadcastNotificationDto,
  QueryBroadcastNotificationsDto,
} from './dto/broadcast-notification.dto';
import { NOTIFICATION_CONSTANTS } from 'src/shared/constants';

@Injectable()
export class BroadcastNotificationService extends BaseService<BroadcastNotification> {
  private readonly logger = new Logger(BroadcastNotificationService.name);

  constructor(
    @InjectRepository(BroadcastNotification)
    private readonly broadcastRepository: Repository<BroadcastNotification>,

    protected readonly cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<BroadcastNotification>(broadcastRepository),
      {
        entityName: 'BroadcastNotification',
        cache: {
          enabled: true,
          ttlSec: NOTIFICATION_CONSTANTS.CACHE.TTL,
          prefix: 'broadcast_notifications',
          swrSec: NOTIFICATION_CONSTANTS.CACHE.SWR_SEC,
        },
        defaultSearchField: 'title',
        emitEvents: false,
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof BroadcastNotification)[] {
    return ['title', 'message'];
  }

  /**
   * Create a new broadcast notification
   */
  async createBroadcast(
    dto: CreateBroadcastNotificationDto,
  ): Promise<BroadcastNotification> {
    try {
      const broadcast = await this.create({
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive ?? true,
        priority: dto.priority || NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
      });

      // Invalidate active broadcasts cache
      await this.invalidateActiveBroadcastsCache();

      this.logger.log(
        `Broadcast notification created: ${broadcast.id}, type: ${dto.type}`,
      );

      return broadcast;
    } catch (error) {
      this.logger.error('Failed to create broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Update broadcast notification
   */
  async updateBroadcast(
    id: string,
    dto: UpdateBroadcastNotificationDto,
  ): Promise<BroadcastNotification> {
    try {
      const broadcast = await this.findById(id);

      if (!broadcast) {
        throw new HttpException(
          { messageKey: 'notification.BROADCAST_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await this.update(id, {
        ...dto,
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : broadcast.expiresAt,
      });

      // Invalidate active broadcasts cache
      await this.invalidateActiveBroadcastsCache();

      this.logger.log(`Broadcast notification updated: ${id}`);

      return updated;
    } catch (error) {
      this.logger.error('Failed to update broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Get active broadcast notifications for users
   */
  async getActiveBroadcasts(): Promise<BroadcastNotification[]> {
    try {
      // Check cache first
      const cacheKey = 'broadcast_notifications:active';
      const cached = await this.cacheService?.get(cacheKey);
      if (cached) {
        this.logger.debug('Active broadcasts cache hit');
        return cached as BroadcastNotification[];
      }

      const now = new Date();
      const broadcasts = await this.broadcastRepository.find({
        where: {
          isActive: true,
          expiresAt: MoreThan(now),
        },
        order: { priority: 'DESC', createdAt: 'DESC' },
      });

      // Cache for 5 minutes
      await this.cacheService?.set(cacheKey, broadcasts, 300);

      return broadcasts;
    } catch (error) {
      this.logger.error('Failed to get active broadcasts:', error);
      throw error;
    }
  }

  /**
   * Get broadcast notifications with filters
   */
  async getBroadcasts(
    query: QueryBroadcastNotificationsDto,
  ): Promise<IPagination<BroadcastNotification>> {
    try {
      const extraFilter: FindOptionsWhere<BroadcastNotification> = {};

      // Apply filters
      if (query.type) extraFilter.type = query.type;
      if (query.priority) extraFilter.priority = query.priority;
      if (query.isActive !== undefined) extraFilter.isActive = query.isActive;

      // Handle expired filter
      if (query.includeExpired === false) {
        const now = new Date();
        extraFilter.expiresAt = MoreThan(now);
      }

      return await this.listOffset(query, extraFilter);
    } catch (error) {
      this.logger.error('Failed to get broadcasts:', error);
      throw error;
    }
  }

  /**
   * Get broadcast statistics
   */
  async getBroadcastStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const now = new Date();

      const [total, active, expired, byTypeRaw, byPriorityRaw] =
        await Promise.all([
          // Total count
          this.broadcastRepository.count(),

          // Active count
          this.broadcastRepository.count({
            where: {
              isActive: true,
              expiresAt: MoreThan(now),
            },
          }),

          // Expired count
          this.broadcastRepository.count({
            where: {
              expiresAt: LessThan(now),
            },
          }),

          // Group by type
          this.broadcastRepository
            .createQueryBuilder('broadcast')
            .select('broadcast.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('broadcast.type')
            .getRawMany(),

          // Group by priority
          this.broadcastRepository
            .createQueryBuilder('broadcast')
            .select('broadcast.priority', 'priority')
            .addSelect('COUNT(*)', 'count')
            .groupBy('broadcast.priority')
            .getRawMany(),
        ]);

      // Convert raw results to maps
      const byTypeMap: Record<string, number> = {};
      byTypeRaw.forEach((item: { type: string; count: string }) => {
        byTypeMap[item.type] = parseInt(item.count, 10);
      });

      const byPriorityMap: Record<string, number> = {};
      byPriorityRaw.forEach((item: { priority: string; count: string }) => {
        byPriorityMap[item.priority] = parseInt(item.count, 10);
      });

      return {
        total,
        active,
        expired,
        byType: byTypeMap,
        byPriority: byPriorityMap,
      };
    } catch (error) {
      this.logger.error('Failed to get broadcast stats:', error);
      throw error;
    }
  }

  /**
   * Deactivate expired broadcasts
   */
  async deactivateExpiredBroadcasts(): Promise<{ deactivated: number }> {
    try {
      const now = new Date();
      const result = await this.broadcastRepository.update(
        {
          isActive: true,
          expiresAt: LessThan(now),
        },
        { isActive: false },
      );

      if (result.affected && result.affected > 0) {
        // Invalidate cache
        await this.invalidateActiveBroadcastsCache();

        this.logger.log(`Deactivated ${result.affected} expired broadcasts`);
      }

      return { deactivated: result.affected || 0 };
    } catch (error) {
      this.logger.error('Failed to deactivate expired broadcasts:', error);
      throw error;
    }
  }

  /**
   * Invalidate active broadcasts cache
   */
  private async invalidateActiveBroadcastsCache(): Promise<void> {
    try {
      const cacheKey = 'broadcast_notifications:active';
      await this.cacheService?.delete(cacheKey);
      this.logger.debug('Invalidated active broadcasts cache');
    } catch (error) {
      this.logger.warn('Failed to invalidate active broadcasts cache:', error);
    }
  }
}
