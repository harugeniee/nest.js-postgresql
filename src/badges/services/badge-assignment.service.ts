import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BadgeAssignmentStatus, BadgeEntityType } from 'src/shared/constants';
import { Repository } from 'typeorm';
import { BadgeAssignment } from '../entities/badge-assignment.entity';

/**
 * Service for managing badge assignments
 * Handles complex badge assignment operations and queries
 */
@Injectable()
export class BadgeAssignmentService {
  private readonly logger = new Logger(BadgeAssignmentService.name);

  constructor(
    @InjectRepository(BadgeAssignment)
    private readonly badgeAssignmentRepository: Repository<BadgeAssignment>,
  ) {}

  /**
   * Get all active badge assignments for an entity
   */
  async getActiveAssignments(
    entityType: BadgeEntityType,
    entityId: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting active assignments for ${entityType}:${entityId}`);

    return this.badgeAssignmentRepository.find({
      where: {
        entityType,
        entityId,
        status: BadgeAssignmentStatus.ACTIVE,
      },
      relations: ['badge'],
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Get badge assignments by badge ID
   */
  async getAssignmentsByBadge(badgeId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting assignments for badge: ${badgeId}`);

    return this.badgeAssignmentRepository.find({
      where: { badgeId },
      relations: ['badge'],
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Get badge assignments by user who assigned them
   */
  async getAssignmentsByUser(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting assignments by user: ${userId}`);

    return this.badgeAssignmentRepository.find({
      where: { assignedBy: userId },
      relations: ['badge'],
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Get expired assignments
   */
  async getExpiredAssignments(): Promise<BadgeAssignment[]> {
    this.logger.log('Getting expired assignments');

    return this.badgeAssignmentRepository.find({
      where: {
        status: BadgeAssignmentStatus.ACTIVE,
        expiresAt: { $lt: new Date() } as any,
      },
      relations: ['badge'],
    });
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

    return this.badgeAssignmentRepository.find({
      where: {
        status: BadgeAssignmentStatus.ACTIVE,
        expiresAt: { $lt: futureDate, $gt: new Date() } as any,
      },
      relations: ['badge'],
      order: { expiresAt: 'ASC' },
    });
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

    const assignmentsByEntityType = entityTypeStats.reduce(
      (acc, stat) => {
        acc[stat.entityType] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const assignmentsByStatus = statusStats.reduce(
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
      const assignment = await this.badgeAssignmentRepository.findOne({
        where: { id: assignmentId },
      });

      if (assignment && assignment.isActive()) {
        assignment.revoke(revokedBy, reason);
        await this.badgeAssignmentRepository.save(assignment);
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
      const assignment = await this.badgeAssignmentRepository.findOne({
        where: { id: assignmentId },
      });

      if (assignment && assignment.isActive()) {
        assignment.suspend(suspendedBy, reason);
        await this.badgeAssignmentRepository.save(assignment);
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
      const assignment = await this.badgeAssignmentRepository.findOne({
        where: { id: assignmentId },
      });

      if (assignment && (assignment.isRevoked() || assignment.isSuspended())) {
        assignment.reactivate();
        await this.badgeAssignmentRepository.save(assignment);
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

    const where: any = {
      assignedAt: { $gte: startDate, $lte: endDate } as any,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    return this.badgeAssignmentRepository.find({
      where,
      relations: ['badge'],
      order: { assignedAt: 'DESC' },
    });
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
