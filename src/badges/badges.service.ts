import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import {
  BADGE_CONSTANTS,
  BadgeAssignmentStatus,
  BadgeCategory,
  BadgeEntityType,
  BadgeRarity,
  BadgeType,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { Repository } from 'typeorm';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GetBadgeAssignmentDto } from './dto/get-badge-assignment.dto';
import { RevokeBadgeDto } from './dto/revoke-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeAssignment } from './entities/badge-assignment.entity';
import { Badge } from './entities/badge.entity';
import { BadgeAssignmentService } from './services/badge-assignment.service';

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
    private readonly badgeAssignmentService: BadgeAssignmentService,
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

    return this.findOne({ type: type as BadgeType });
  }

  /**
   * Get badges by category
   */
  async getBadgesByCategory(category: string): Promise<Badge[]> {
    this.logger.log(`Getting badges by category: ${category}`);

    const result = await this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
        sortBy: 'createdAt',
        order: 'DESC',
      },
      { category: category as BadgeCategory },
    );
    return result.result;
  }

  /**
   * Get badges by rarity
   */
  async getBadgesByRarity(rarity: string): Promise<Badge[]> {
    this.logger.log(`Getting badges by rarity: ${rarity}`);

    const result = await this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
        sortBy: 'createdAt',
        order: 'DESC',
      },
      { rarity: rarity as BadgeRarity },
    );
    return result.result;
  }

  /**
   * Get visible badges only
   */
  async getVisibleBadges(): Promise<Badge[]> {
    this.logger.log('Getting visible badges');

    const result = await this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
        sortBy: 'createdAt',
        order: 'DESC',
      },
      { isVisible: true, status: 'active' as any },
    );
    return result.result;
  }

  /**
   * Get obtainable badges only
   */
  async getObtainableBadges(): Promise<Badge[]> {
    this.logger.log('Getting obtainable badges');

    const result = await this.listOffset(
      {
        page: 1,
        limit: BADGE_CONSTANTS.MAX_BADGES_PER_ENTITY,
        sortBy: 'createdAt',
        order: 'DESC',
      },
      { isObtainable: true, status: 'active' as any },
    );
    return result.result;
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
    const existingAssignment = await this.badgeAssignmentService.findOne({
      badgeId: assignBadgeDto.badgeId,
      entityType: assignBadgeDto.entityType,
      entityId: assignBadgeDto.entityId,
    });

    if (existingAssignment && existingAssignment.isActive()) {
      throw new Error('Badge is already assigned to this entity');
    }

    // Create new assignment using BadgeAssignmentService
    const savedAssignment = await this.badgeAssignmentService.create({
      badgeId: assignBadgeDto.badgeId,
      entityType: assignBadgeDto.entityType,
      entityId: assignBadgeDto.entityId,
      assignedBy,
      assignmentReason: assignBadgeDto.assignmentReason,
      isVisible: assignBadgeDto.isVisible ?? true,
      metadata: assignBadgeDto.metadata,
      expiresAt: assignBadgeDto.expiresAt
        ? new Date(assignBadgeDto.expiresAt)
        : undefined,
    });

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

    const assignment = await this.badgeAssignmentService.findById(
      assignmentId,
      {
        relations: ['badge'],
      },
    );

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

    const savedAssignment = await this.badgeAssignmentService.update(
      assignmentId,
      assignment,
    );

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

    // Build extra filters for complex date range queries
    const extraFilter: Record<string, unknown> = {
      badgeId: query.badgeId,
      status: query.statuses,
      isVisible: query.isVisible,
      isManuallyRevokable: query.isManuallyRevokable,
    };

    // Add expiration date filters
    if (query.expiresFrom || query.expiresTo) {
      if (query.expiresFrom) {
        extraFilter.expiresAt = {
          ...((extraFilter.expiresAt as Record<string, unknown>) || {}),
          $gte: new Date(query.expiresFrom),
        };
      }
      if (query.expiresTo) {
        extraFilter.expiresAt = {
          ...((extraFilter.expiresAt as Record<string, unknown>) || {}),
          $lte: new Date(query.expiresTo),
        };
      }
    }

    // Add revocation date filters
    if (query.revokedFrom || query.revokedTo) {
      if (query.revokedFrom) {
        extraFilter.revokedAt = {
          ...((extraFilter.revokedAt as Record<string, unknown>) || {}),
          $gte: new Date(query.revokedFrom),
        };
      }
      if (query.revokedTo) {
        extraFilter.revokedAt = {
          ...((extraFilter.revokedAt as Record<string, unknown>) || {}),
          $lte: new Date(query.revokedTo),
        };
      }
    }

    // Use BadgeAssignmentService for pagination
    const result = await this.badgeAssignmentService.listOffset(
      {
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'assignedAt',
        order: query.order || 'DESC',
        query: query.query,
        fields: ['assignmentReason', 'revocationReason'],
        fromDate: query.assignedFrom ? new Date(query.assignedFrom) : undefined,
        toDate: query.assignedTo ? new Date(query.assignedTo) : undefined,
      },
      {
        entityType: query.entityType,
        entityId: query.entityId,
        assignedBy: query.assignedBy,
        revokedBy: query.revokedBy,
        ...extraFilter,
      },
      { relations: ['badge'] },
    );

    return {
      result: result.result,
      metaData: result.metaData,
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

    return this.badgeAssignmentService.getActiveAssignments(
      entityType,
      entityId,
    );
  }

  /**
   * Get badge assignment by ID
   */
  async getBadgeAssignment(
    assignmentId: string,
  ): Promise<BadgeAssignment | null> {
    this.logger.log(`Getting badge assignment: ${assignmentId}`);

    return this.badgeAssignmentService.findById(assignmentId, {
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

    const assignment = await this.badgeAssignmentService.findOne(
      {
        entityType,
        entityId,
        status: BadgeAssignmentStatus.ACTIVE,
        badge: { type: badgeType as BadgeType },
      },
      {
        relations: ['badge'],
      },
    );

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
      this.badgeAssignmentService
        .getAssignmentStatistics()
        .then((stats) => stats.activeAssignments),
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

    const badgesByCategory = (
      categoryStats as Array<{ category: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.category] = parseInt(stat.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const badgesByRarity = (
      rarityStats as Array<{ rarity: string; count: string }>
    ).reduce(
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

    const expiredAssignments =
      await this.badgeAssignmentService.getExpiredAssignments();

    let cleanedCount = 0;
    for (const assignment of expiredAssignments) {
      assignment.status = BadgeAssignmentStatus.EXPIRED;
      await this.badgeAssignmentService.update(assignment.id, assignment);

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
