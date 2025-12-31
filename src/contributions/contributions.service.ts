import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CharactersService } from 'src/characters/characters.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SeriesService } from 'src/series/series.service';
import { SegmentsService } from 'src/series/services/segments.service';
import {
  CONTRIBUTION_CONSTANTS,
  NOTIFICATION_TYPES,
  USER_CONSTANTS,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { StaffsService } from 'src/staffs/staffs.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { CreateContributionDto } from './dto';
import { Contribution } from './entities/contribution.entity';

/**
 * Contributions Service
 *
 * Service for managing user contributions (create/update requests for entities).
 * Extends BaseService to provide CRUD operations, pagination, caching, and lifecycle hooks.
 */
@Injectable()
export class ContributionsService extends BaseService<Contribution> {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    cacheService: CacheService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly seriesService: SeriesService,
    private readonly segmentsService: SegmentsService,
    private readonly charactersService: CharactersService,
    private readonly staffsService: StaffsService,
  ) {
    super(
      new TypeOrmBaseRepository<Contribution>(contributionRepository),
      {
        entityName: 'Contribution',
        cache: {
          enabled: true,
          ttlSec: 60,
          prefix: 'contributions',
          swrSec: 30,
        },
        defaultSearchField: 'entityType',
        relationsWhitelist: {
          contributor: true,
          reviewer: true,
        },
        selectWhitelist: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          proposedData: true,
          originalData: true,
          status: true,
          contributorId: true,
          reviewerId: true,
          rejectionReason: true,
          adminNotes: true,
          contributorNote: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          contributor: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
          reviewer: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Contribution)[] {
    return ['entityType', 'status'];
  }

  /**
   * Create a new contribution with original data fetching for update actions
   * @param dto Contribution creation data
   * @returns Created contribution entity
   */
  async createContribution(
    dto: CreateContributionDto & { contributorId: string },
  ): Promise<Contribution> {
    // If action is 'update', fetch original data for comparison
    let originalData: Record<string, unknown> | undefined;

    if (dto.action === CONTRIBUTION_CONSTANTS.ACTION.UPDATE && dto.entityId) {
      try {
        const originalEntity = await this.getOriginalEntity(
          dto.entityType,
          dto.entityId,
        );
        if (originalEntity) {
          originalData = originalEntity as unknown as Record<string, unknown>;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch original entity for contribution: ${dto.entityType}:${dto.entityId}`,
          error,
        );
        // If entity not found, still allow contribution creation
        // The error will be caught during approval
      }
    }

    return this.create({
      ...dto,
      originalData,
      status: CONTRIBUTION_CONSTANTS.STATUS.PENDING,
    });
  }

  /**
   * Helper method to get original entity data for comparison
   * @param entityType Type of entity
   * @param entityId ID of the entity
   * @returns Original entity data or null
   */
  private async getOriginalEntity(
    entityType: string,
    entityId: string,
  ): Promise<unknown> {
    switch (entityType) {
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SERIES:
        return this.seriesService.findById(entityId);
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SEGMENT:
        return this.segmentsService.findById(entityId);
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.CHARACTER:
        return this.charactersService.findById(entityId);
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.STAFF:
        return this.staffsService.findById(entityId);
      default:
        return null;
    }
  }

  /**
   * Lifecycle hook: After contribution is created, notify admins
   */
  protected async afterCreate(entity: Contribution): Promise<void> {
    try {
      // Notify all admins about the new contribution
      await this.notifyAdminsAboutNewContribution(entity);
    } catch (error) {
      this.logger.error(
        `Failed to send notification after contribution creation: ${entity.id}`,
        error,
      );
      // Don't throw - notification failure shouldn't break contribution creation
    }
  }

  /**
   * Lifecycle hook: After contribution status is updated, notify contributor
   */
  protected async afterUpdate(entity: Contribution): Promise<void> {
    try {
      // Only notify if status changed to approved or rejected
      if (
        entity.status === CONTRIBUTION_CONSTANTS.STATUS.APPROVED ||
        entity.status === CONTRIBUTION_CONSTANTS.STATUS.REJECTED
      ) {
        await this.notifyContributorAboutStatusChange(entity);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification after contribution update: ${entity.id}`,
        error,
      );
      // Don't throw - notification failure shouldn't break contribution update
    }
  }

  /**
   * Get pending contributions (for admin review)
   */
  async findPending(
    queryDto: any,
  ): Promise<{ result: Contribution[]; metaData: any }> {
    return this.listOffset(
      {
        ...queryDto,
        status: CONTRIBUTION_CONSTANTS.STATUS.PENDING,
      },
      { status: CONTRIBUTION_CONSTANTS.STATUS.PENDING },
      {
        relations: ['contributor'],
        select: this.opts.selectWhitelist,
      },
    );
  }

  /**
   * Get contributions by contributor ID
   */
  async findByContributor(
    contributorId: string,
    queryDto: any,
  ): Promise<{ result: Contribution[]; metaData: any }> {
    return this.listOffset(
      {
        ...queryDto,
        contributorId,
      },
      { contributorId },
      {
        relations: ['contributor', 'reviewer'],
        select: this.opts.selectWhitelist,
      },
    );
  }

  /**
   * Notify all admins about a new contribution
   */
  private async notifyAdminsAboutNewContribution(
    contribution: Contribution,
  ): Promise<void> {
    try {
      // Find all admin users using the User repository
      const adminUsers = await this.contributionRepository.manager
        .getRepository(User)
        .find({
          where: { role: USER_CONSTANTS.ROLES.ADMIN },
          take: 100, // Limit to 100 admins
        });

      if (!adminUsers || adminUsers.length === 0) {
        this.logger.warn('No admin users found to notify about contribution');
        return;
      }

      // Send notification to each admin
      const notificationPromises = adminUsers.map((admin) =>
        this.notificationsService.createNotification(admin.id, {
          type: NOTIFICATION_TYPES.CONTENT_REPORTED, // Reuse existing type for now
          title: `New Contribution: ${contribution.entityType}`,
          message: `A new ${contribution.action} contribution for ${contribution.entityType} has been submitted and is pending review.`,
          actionUrl: `/admin/contributions/${contribution.id}`,
          metadata: {
            contributionId: contribution.id,
            entityType: contribution.entityType,
            action: contribution.action,
          },
        }),
      );

      await Promise.allSettled(notificationPromises);
      this.logger.log(
        `Notified ${adminUsers.length} admins about contribution ${contribution.id}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to notify admins about new contribution',
        error,
      );
      throw error;
    }
  }

  /**
   * Notify contributor about status change (approved/rejected)
   */
  private async notifyContributorAboutStatusChange(
    contribution: Contribution,
  ): Promise<void> {
    try {
      const isApproved =
        contribution.status === CONTRIBUTION_CONSTANTS.STATUS.APPROVED;
      const title = isApproved
        ? 'Contribution Approved'
        : 'Contribution Rejected';
      const message = isApproved
        ? `Your ${contribution.action} contribution for ${contribution.entityType} has been approved.`
        : `Your ${contribution.action} contribution for ${contribution.entityType} has been rejected.${contribution.rejectionReason ? ` Reason: ${contribution.rejectionReason}` : ''}`;

      await this.notificationsService.createNotification(
        contribution.contributorId,
        {
          type: isApproved
            ? NOTIFICATION_TYPES.CONTENT_APPROVED
            : NOTIFICATION_TYPES.CONTENT_REJECTED,
          title,
          message,
          actionUrl: `/contributions/${contribution.id}`,
          metadata: {
            contributionId: contribution.id,
            entityType: contribution.entityType,
            action: contribution.action,
            status: contribution.status,
          },
        },
      );

      this.logger.log(
        `Notified contributor ${contribution.contributorId} about contribution ${contribution.id} status: ${contribution.status}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to notify contributor about status change',
        error,
      );
      throw error;
    }
  }
}
