import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import {
  BADGE_CONSTANTS,
  BadgeAssignmentStatus,
  BadgeEntityType,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { Repository } from 'typeorm';
import { BadgeAssignment } from '../entities/badge-assignment.entity';

/**
 * Service for managing badge assignments
 * Handles complex badge assignment operations and queries
 */
@Injectable()
export class BadgeAssignmentService extends BaseService<BadgeAssignment> {
  private readonly logger = new Logger(BadgeAssignmentService.name);

  constructor(
    @InjectRepository(BadgeAssignment)
    private readonly badgeAssignmentRepository: Repository<BadgeAssignment>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<BadgeAssignment>(badgeAssignmentRepository),
      {
        entityName: 'BadgeAssignment',
        cache: {
          enabled: true,
          ttlSec: BADGE_CONSTANTS.CACHE_TTL_SEC,
          swrSec: BADGE_CONSTANTS.CACHE_SWR_SEC,
          prefix: 'badge_assignments',
        },
        defaultSearchField: 'assignmentReason',
        relationsWhitelist: {
          badge: true,
        },
        selectWhitelist: {
          id: true,
          badgeId: true,
          entityType: true,
          entityId: true,
          status: true,
          assignedAt: true,
          expiresAt: true,
          revokedAt: true,
          assignedBy: true,
          revokedBy: true,
          assignmentReason: true,
          revocationReason: true,
          isVisible: true,
          isManuallyRevokable: true,
          metadata: true,
          badge: {
            id: true,
            type: true,
            name: true,
            description: true,
            category: true,
            rarity: true,
            iconUrl: true,
            color: true,
          },
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof BadgeAssignment)[] {
    return ['assignmentReason', 'revocationReason'];
  }

  /**
   * Get all active badge assignments for an entity
   */
  async getActiveAssignments(
    entityType: BadgeEntityType,
    entityId: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting active assignments for ${entityType}:${entityId}`);

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'assignedAt',
        order: 'DESC',
      },
      {
        entityType,
        entityId,
        status: BadgeAssignmentStatus.ACTIVE,
      },
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get badge assignments by badge ID
   */
  async getAssignmentsByBadge(badgeId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting assignments for badge: ${badgeId}`);

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'assignedAt',
        order: 'DESC',
      },
      { badgeId },
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get badge assignments by user who assigned them
   */
  async getAssignmentsByUser(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting assignments by user: ${userId}`);

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'assignedAt',
        order: 'DESC',
      },
      { assignedBy: userId },
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get expired assignments
   */
  async getExpiredAssignments(): Promise<BadgeAssignment[]> {
    this.logger.log('Getting expired assignments');

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'assignedAt',
        order: 'DESC',
      },
      {
        status: BadgeAssignmentStatus.ACTIVE,
        expiresAt: { $lt: new Date() } as any,
      },
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get assignments expiring soon (within specified days)
   */
  async getAssignmentsExpiringSoon(
    days: number = 7,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting assignments expiring within ${days} days`);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'expiresAt',
        order: 'ASC',
      },
      {
        status: BadgeAssignmentStatus.ACTIVE,
        expiresAt: { $lt: futureDate, $gt: new Date() } as any,
      },
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStatistics(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    expiredAssignments: number;
    revokedAssignments: number;
    suspendedAssignments: number;
    assignmentsByEntityType: Record<string, number>;
    assignmentsByStatus: Record<string, number>;
  }> {
    this.logger.log('Getting assignment statistics');

    const [
      totalAssignments,
      activeAssignments,
      expiredAssignments,
      revokedAssignments,
      suspendedAssignments,
      entityTypeStats,
      statusStats,
    ] = await Promise.all([
      this.badgeAssignmentRepository.count(),
      this.badgeAssignmentRepository.count({
        where: { status: BadgeAssignmentStatus.ACTIVE },
      }),
      this.badgeAssignmentRepository.count({
        where: { status: BadgeAssignmentStatus.EXPIRED },
      }),
      this.badgeAssignmentRepository.count({
        where: { status: BadgeAssignmentStatus.REVOKED },
      }),
      this.badgeAssignmentRepository.count({
        where: { status: BadgeAssignmentStatus.SUSPENDED },
      }),
      this.badgeAssignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.entityType', 'entityType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('assignment.entityType')
        .getRawMany(),
      this.badgeAssignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('assignment.status')
        .getRawMany(),
    ]);

    const assignmentsByEntityType = (
      entityTypeStats as Array<{ entityType: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.entityType] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const assignmentsByStatus = (
      statusStats as Array<{ status: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalAssignments,
      activeAssignments,
      expiredAssignments,
      revokedAssignments,
      suspendedAssignments,
      assignmentsByEntityType,
      assignmentsByStatus,
    };
  }

  /**
   * Bulk revoke assignments
   */
  async bulkRevokeAssignments(
    assignmentIds: string[],
    revokedBy?: string,
    reason?: string,
  ): Promise<number> {
    this.logger.log(`Bulk revoking ${assignmentIds.length} assignments`);

    let revokedCount = 0;
    for (const assignmentId of assignmentIds) {
      const assignment = await this.findById(assignmentId);

      if (assignment && assignment.isActive()) {
        assignment.revoke(revokedBy, reason);
        await this.update(assignmentId, assignment);
        revokedCount++;
      }
    }

    this.logger.log(`Bulk revoked ${revokedCount} assignments`);
    return revokedCount;
  }

  /**
   * Bulk suspend assignments
   */
  async bulkSuspendAssignments(
    assignmentIds: string[],
    suspendedBy?: string,
    reason?: string,
  ): Promise<number> {
    this.logger.log(`Bulk suspending ${assignmentIds.length} assignments`);

    let suspendedCount = 0;
    for (const assignmentId of assignmentIds) {
      const assignment = await this.findById(assignmentId);

      if (assignment && assignment.isActive()) {
        assignment.suspend(suspendedBy, reason);
        await this.update(assignmentId, assignment);
        suspendedCount++;
      }
    }

    this.logger.log(`Bulk suspended ${suspendedCount} assignments`);
    return suspendedCount;
  }

  /**
   * Bulk reactivate assignments
   */
  async bulkReactivateAssignments(assignmentIds: string[]): Promise<number> {
    this.logger.log(`Bulk reactivating ${assignmentIds.length} assignments`);

    let reactivatedCount = 0;
    for (const assignmentId of assignmentIds) {
      const assignment = await this.findById(assignmentId);

      if (assignment && (assignment.isRevoked() || assignment.isSuspended())) {
        assignment.reactivate();
        await this.update(assignmentId, assignment);
        reactivatedCount++;
      }
    }

    this.logger.log(`Bulk reactivated ${reactivatedCount} assignments`);
    return reactivatedCount;
  }

  /**
   * Get assignments by date range
   */
  async getAssignmentsByDateRange(
    startDate: Date,
    endDate: Date,
    entityType?: BadgeEntityType,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(
      `Getting assignments from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const extraFilter: Record<string, unknown> = {
      assignedAt: { $gte: startDate, $lte: endDate } as any,
    };

    if (entityType) {
      extraFilter.entityType = entityType;
    }

    const result = await this.listOffset(
      {
        page: 1,
        limit: 100,
        sortBy: 'assignedAt',
        order: 'DESC',
      },
      extraFilter,
      { relations: ['badge'] },
    );
    return result.result;
  }

  /**
   * Get most assigned badges
   */
  async getMostAssignedBadges(
    limit: number = 10,
  ): Promise<Array<{ badgeId: string; count: number }>> {
    this.logger.log(`Getting most assigned badges (limit: ${limit})`);

    return this.badgeAssignmentRepository
      .createQueryBuilder('assignment')
      .select('assignment.badgeId', 'badgeId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('assignment.badgeId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /**
   * Get assignment trends over time
   */
  async getAssignmentTrends(
    days: number = 30,
  ): Promise<Array<{ date: string; count: number }>> {
    this.logger.log(`Getting assignment trends for ${days} days`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.badgeAssignmentRepository
      .createQueryBuilder('assignment')
      .select('DATE(assignment.assignedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('assignment.assignedAt >= :startDate', { startDate })
      .groupBy('DATE(assignment.assignedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}
