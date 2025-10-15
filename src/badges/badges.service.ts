import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import {
  BADGE_CONSTANTS,
  BadgeAssignmentStatus,
  BadgeEntityType,
} from 'src/shared/constants';
import { ConditionBuilder } from 'src/shared/helpers';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { Repository } from 'typeorm';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GetBadgeAssignmentDto } from './dto/get-badge-assignment.dto';
import { RevokeBadgeDto } from './dto/revoke-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeAssignment } from './entities/badge-assignment.entity';
import { Badge } from './entities/badge.entity';

/**
 * Badge service extending BaseService for badge management
 * Handles badge CRUD operations and badge assignments
 */
@Injectable()
export class BadgesService extends BaseService<Badge> {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(BadgeAssignment)
    private readonly badgeAssignmentRepository: Repository<BadgeAssignment>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Badge>(badgeRepository),
      {
        entityName: 'Badge',
        cache: {
          enabled: true,
          ttlSec: BADGE_CONSTANTS.CACHE_TTL_SEC,
          swrSec: BADGE_CONSTANTS.CACHE_SWR_SEC,
          prefix: 'badges',
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          assignments: true,
        },
        selectWhitelist: {
          id: true,
          type: true,
          name: true,
          description: true,
          category: true,
          rarity: true,
          status: true,
          isVisible: true,
          isObtainable: true,
          displayOrder: true,
          iconUrl: true,
          color: true,
          requirements: true,
          isAutoAssigned: true,
          isManuallyAssignable: true,
          isRevokable: true,
          assignmentCount: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Badge)[] {
    return ['name', 'description', 'type'];
  }

  /**
   * Create a new badge
   */
  async createBadge(createBadgeDto: CreateBadgeDto): Promise<Badge> {
    this.logger.log(`Creating badge: ${createBadgeDto.type}`);

    const badge = await this.create(createBadgeDto);

    this.logger.log(`Badge created successfully: ${badge.id}`);
    return badge;
  }

  /**
   * Update an existing badge
   */
  async updateBadge(
    id: string,
    updateBadgeDto: UpdateBadgeDto,
  ): Promise<Badge> {
    this.logger.log(`Updating badge: ${id}`);

    const badge = await this.update(id, updateBadgeDto);

    this.logger.log(`Badge updated successfully: ${id}`);
    return badge;
  }

  /**
   * Get badge by type
   */
  async getBadgeByType(type: string): Promise<Badge | null> {
    this.logger.log(`Getting badge by type: ${type}`);

    return this.findOne({ type: type as any });
  }

  /**
   * Get badges by category
   */
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    this.logger.log(`Getting badges by category: ${category}`);

    return this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
      },
      { category: category as any },
    );
  }

  /**
   * Get badges by rarity
   */
  async getBadgesByRarity(rarity: string): Promise<Badge[]> {
    this.logger.log(`Getting badges by rarity: ${rarity}`);

    return this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
      },
      { rarity: rarity as any },
    );
  }

  /**
   * Get visible badges only
   */
  async getVisibleBadges(): Promise<Badge[]> {
    this.logger.log('Getting visible badges');

    return this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
      },
      { isVisible: true, status: 'active' as any },
    );
  }

  /**
   * Get obtainable badges only
   */
  async getObtainableBadges(): Promise<Badge[]> {
    this.logger.log('Getting obtainable badges');

    return this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
      },
      { isObtainable: true, status: 'active' as any },
    );
  }

  /**
   * Assign a badge to an entity
   */
  async assignBadge(
    assignBadgeDto: AssignBadgeDto,
    assignedBy?: string,
  ): Promise<BadgeAssignment> {
    this.logger.log(
      `Assigning badge ${assignBadgeDto.badgeId} to ${assignBadgeDto.entityType}:${assignBadgeDto.entityId}`,
    );

    // Check if badge exists and can be assigned
    const badge = await this.findById(assignBadgeDto.badgeId);
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    if (!badge.canBeAssigned()) {
      throw new Error('Badge cannot be assigned');
    }

    // Check if assignment already exists
    const existingAssignment = await this.badgeAssignmentRepository.findOne({
      where: {
        badgeId: assignBadgeDto.badgeId,
        entityType: assignBadgeDto.entityType,
        entityId: assignBadgeDto.entityId,
      },
    });

    if (existingAssignment && existingAssignment.isActive()) {
      throw new Error('Badge is already assigned to this entity');
    }

    // Create new assignment
    const assignment = this.badgeAssignmentRepository.create({
      badgeId: assignBadgeDto.badgeId,
      entityType: assignBadgeDto.entityType,
      entityId: assignBadgeDto.entityId,
      assignedBy,
      assignmentReason: assignBadgeDto.assignmentReason,
      isVisible: assignBadgeDto.isVisible ?? true,
      metadata: assignBadgeDto.metadata,
      expiresAt: assignBadgeDto.expiresAt
        ? new Date(assignBadgeDto.expiresAt)
        : null,
    });

    const savedAssignment =
      await this.badgeAssignmentRepository.save(assignment);

    // Update badge assignment count
    badge.incrementAssignmentCount();
    await this.badgeRepository.save(badge);

    this.logger.log(`Badge assigned successfully: ${savedAssignment.id}`);
    return savedAssignment;
  }

  /**
   * Revoke a badge assignment
   */
  async revokeBadge(
    assignmentId: string,
    revokeBadgeDto: RevokeBadgeDto,
    revokedBy?: string,
  ): Promise<BadgeAssignment> {
    this.logger.log(`Revoking badge assignment: ${assignmentId}`);

    const assignment = await this.badgeAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['badge'],
    });

    if (!assignment) {
      throw new NotFoundException('Badge assignment not found');
    }

    if (!assignment.isActive()) {
      throw new Error('Badge assignment is not active');
    }

    // Revoke the assignment
    assignment.revoke(revokedBy, revokeBadgeDto.revocationReason);

    // Update metadata if provided
    if (revokeBadgeDto.metadata) {
      assignment.metadata = {
        ...assignment.metadata,
        ...revokeBadgeDto.metadata,
      };
    }

    const savedAssignment =
      await this.badgeAssignmentRepository.save(assignment);

    // Update badge assignment count
    if (assignment.badge) {
      assignment.badge.decrementAssignmentCount();
      await this.badgeRepository.save(assignment.badge);
    }

    this.logger.log(`Badge assignment revoked successfully: ${assignmentId}`);
    return savedAssignment;
  }

  /**
   * Get badge assignments with filters
   */
  async getBadgeAssignments(
    query: GetBadgeAssignmentDto,
  ): Promise<{ result: BadgeAssignment[]; metaData: any }> {
    this.logger.log('Getting badge assignments with filters');

    const where = ConditionBuilder.build(
      {
        badgeId: query.badgeId,
        entityType: query.entityType,
        entityId: query.entityId,
        assignedBy: query.assignedBy,
        revokedBy: query.revokedBy,
        fromDate: query.assignedFrom,
        toDate: query.assignedTo,
        query: query.query,
        fields: ['assignmentReason', 'revocationReason'],
      },
      'assignedAt',
      {
        status: query.statuses,
        isVisible: query.isVisible,
        isManuallyRevokable: query.isManuallyRevokable,
      },
    );

    // Add expiration date filters
    if (query.expiresFrom || query.expiresTo) {
      if (query.expiresFrom) {
        where.expiresAt = {
          ...where.expiresAt,
          $gte: new Date(query.expiresFrom),
        };
      }
      if (query.expiresTo) {
        where.expiresAt = {
          ...where.expiresAt,
          $lte: new Date(query.expiresTo),
        };
      }
    }

    // Add revocation date filters
    if (query.revokedFrom || query.revokedTo) {
      if (query.revokedFrom) {
        where.revokedAt = {
          ...where.revokedAt,
          $gte: new Date(query.revokedFrom),
        };
      }
      if (query.revokedTo) {
        where.revokedAt = {
          ...where.revokedAt,
          $lte: new Date(query.revokedTo),
        };
      }
    }

    const result = await this.badgeAssignmentRepository.findAndCount({
      where,
      relations: ['badge'],
      order: { [query.sortBy || 'assignedAt']: query.order || 'DESC' },
      skip: ((query.page || 1) - 1) * (query.limit || 20),
      take: query.limit || 20,
    });

    return {
      result: result[0],
      metaData: {
        currentPage: query.page || 1,
        pageSize: query.limit || 20,
        totalRecords: result[1],
        totalPages: Math.ceil(result[1] / (query.limit || 20)),
      },
    };
  }

  /**
   * Get badges assigned to a specific entity
   */
  async getEntityBadges(
    entityType: BadgeEntityType,
    entityId: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Getting badges for ${entityType}:${entityId}`);

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
   * Get badge assignment by ID
   */
  async getBadgeAssignment(
    assignmentId: string,
  ): Promise<BadgeAssignment | null> {
    this.logger.log(`Getting badge assignment: ${assignmentId}`);

    return this.badgeAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['badge'],
    });
  }

  /**
   * Check if an entity has a specific badge
   */
  async hasBadge(
    entityType: BadgeEntityType,
    entityId: string,
    badgeType: string,
  ): Promise<boolean> {
    this.logger.log(
      `Checking if ${entityType}:${entityId} has badge: ${badgeType}`,
    );

    const assignment = await this.badgeAssignmentRepository.findOne({
      where: {
        entityType,
        entityId,
        status: BadgeAssignmentStatus.ACTIVE,
        badge: { type: badgeType as any },
      },
      relations: ['badge'],
    });

    return !!assignment && assignment.isActive();
  }

  /**
   * Get badge statistics
   */
  async getBadgeStatistics(): Promise<{
    totalBadges: number;
    activeBadges: number;
    totalAssignments: number;
    badgesByCategory: Record<string, number>;
    badgesByRarity: Record<string, number>;
  }> {
    this.logger.log('Getting badge statistics');

    const [
      totalBadges,
      activeBadges,
      totalAssignments,
      categoryStats,
      rarityStats,
    ] = await Promise.all([
      this.badgeRepository.count(),
      this.badgeRepository.count({ where: { status: 'active' as any } }),
      this.badgeAssignmentRepository.count({
        where: { status: BadgeAssignmentStatus.ACTIVE },
      }),
      this.badgeRepository
        .createQueryBuilder('badge')
        .select('badge.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('badge.category')
        .getRawMany(),
      this.badgeRepository
        .createQueryBuilder('badge')
        .select('badge.rarity', 'rarity')
        .addSelect('COUNT(*)', 'count')
        .groupBy('badge.rarity')
        .getRawMany(),
    ]);

    const badgesByCategory = categoryStats.reduce(
      (acc, stat) => {
        acc[stat.category] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const badgesByRarity = rarityStats.reduce(
      (acc, stat) => {
        acc[stat.rarity] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalBadges,
      activeBadges,
      totalAssignments,
      badgesByCategory,
      badgesByRarity,
    };
  }

  /**
   * Clean up expired badge assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    this.logger.log('Cleaning up expired badge assignments');

    const expiredAssignments = await this.badgeAssignmentRepository.find({
      where: {
        status: BadgeAssignmentStatus.ACTIVE,
        expiresAt: { $lt: new Date() } as any,
      },
    });

    let cleanedCount = 0;
    for (const assignment of expiredAssignments) {
      assignment.status = BadgeAssignmentStatus.EXPIRED;
      await this.badgeAssignmentRepository.save(assignment);

      // Update badge assignment count
      const badge = await this.badgeRepository.findOne({
        where: { id: assignment.badgeId },
      });
      if (badge) {
        badge.decrementAssignmentCount();
        await this.badgeRepository.save(badge);
      }

      cleanedCount++;
    }

    this.logger.log(`Cleaned up ${cleanedCount} expired badge assignments`);
    return cleanedCount;
  }

  /**
   * Lifecycle hook: after badge creation
   */
  protected async afterCreate(entity: Badge): Promise<void> {
    this.logger.log(`Badge created: ${entity.id} (${entity.type})`);
  }

  /**
   * Lifecycle hook: after badge update
   */
  protected async afterUpdate(entity: Badge): Promise<void> {
    this.logger.log(`Badge updated: ${entity.id} (${entity.type})`);
  }

  /**
   * Lifecycle hook: after badge deletion
   */
  protected async afterDelete(id: string): Promise<void> {
    this.logger.log(`Badge deleted: ${id}`);
  }
}
