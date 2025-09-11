import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CreateOrSetReactionDto } from './dto/create-reaction.dto';
import { QueryReactionsDto } from './dto/query-reactions.dto';
import { BatchCountsDto } from './dto/batch-counts.dto';
import { CacheService } from 'src/shared/services';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { AdvancedPaginationDto } from 'src/common/dto';

@Injectable()
export class ReactionsService extends BaseService<Reaction> {
  constructor(
    @InjectRepository(Reaction)
    protected readonly reactionRepository: Repository<Reaction>,
    @InjectRepository(ReactionCount)
    protected readonly reactionCountRepository: Repository<ReactionCount>,
    protected readonly dataSource: DataSource,
    protected readonly cacheService: CacheService,
    protected readonly eventEmitter: EventEmitter2,
  ) {
    super(
      new TypeOrmBaseRepository<Reaction>(reactionRepository),
      {
        entityName: 'Reaction',
        cache: { enabled: true, ttlSec: 60, prefix: 'reactions', swrSec: 30 },
        defaultSearchField: 'kind',
        relationsWhitelist: {
          user: true,
        },
        emitEvents: true,
      },
      cacheService,
      eventEmitter,
    );
  }

  /**
   * Define searchable columns for Reaction entity
   * @returns Array of searchable column names
   */
  protected getSearchableColumns(): (keyof Reaction)[] {
    return ['kind', 'subjectType'];
  }

  async toggle(
    userId: string,
    dto: CreateOrSetReactionDto,
  ): Promise<Reaction | null> {
    const { subjectType, subjectId, kind } = dto;

    const existingReaction = await this.findOne({
      userId,
      subjectType,
      subjectId: String(subjectId),
      kind,
    });

    if (existingReaction) {
      return this.unset(userId, dto);
    } else {
      return this.set(userId, dto);
    }
  }

  async set(userId: string, dto: CreateOrSetReactionDto): Promise<Reaction> {
    const { subjectType, subjectId, kind } = dto;

    return this.runInTransaction(async (queryRunner) => {
      // Create or restore reaction
      const reaction = await this.create(
        {
          userId,
          subjectType,
          subjectId: String(subjectId),
          kind,
        },
        { queryRunner },
      );

      // Update count
      await this.updateCount(
        queryRunner.manager,
        subjectType,
        String(subjectId),
        kind,
        1,
      );

      // Emit event
      this.eventEmitter.emit('reaction.set', {
        userId,
        subjectType,
        subjectId,
        kind,
        count: await this.getCount(subjectType, String(subjectId), kind),
      });

      return reaction;
    });
  }

  async unset(userId: string, dto: CreateOrSetReactionDto): Promise<null> {
    const { subjectType, subjectId, kind } = dto;

    return this.runInTransaction(async (queryRunner) => {
      // Find the reaction first
      const reaction = await this.findOne({
        userId,
        subjectType,
        subjectId: String(subjectId),
        kind,
      });

      if (reaction) {
        // Soft delete reaction
        await this.softDelete(reaction.id, { queryRunner });

        // Update count
        await this.updateCount(
          queryRunner.manager,
          subjectType,
          String(subjectId),
          kind,
          -1,
        );

        // Emit event
        this.eventEmitter.emit('reaction.unset', {
          userId,
          subjectType,
          subjectId,
          kind,
          count: await this.getCount(subjectType, String(subjectId), kind),
        });
      }

      return null;
    });
  }

  async list(
    dto: QueryReactionsDto,
  ): Promise<{ reactions: Reaction[]; total: number }> {
    const { subjectType, subjectId, kind, userId, ...paginationDto } = dto;

    // Build extra filter for BaseService
    const extraFilter: Record<string, unknown> = {};
    if (subjectType) extraFilter.subjectType = subjectType;
    if (subjectId) extraFilter.subjectId = subjectId;
    if (kind) extraFilter.kind = kind;
    if (userId) extraFilter.userId = userId;

    // Use BaseService.listOffset for pagination
    const result = await this.listOffset(
      paginationDto as AdvancedPaginationDto,
      extraFilter,
      { relations: ['user'] },
    );

    return {
      reactions: result.result,
      total: result.metaData.totalRecords || 0,
    };
  }

  async hasReacted(
    userId: string,
    subjectType: string,
    subjectId: string,
    kind: string,
  ): Promise<boolean> {
    const reaction = await this.findOne({
      userId,
      subjectType,
      subjectId: String(subjectId),
      kind,
    });

    return !!reaction;
  }

  async getCounts(
    subjectType: string,
    subjectId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    const cacheKey = `reactions:counts:${subjectType}:${subjectId}:${kinds?.join(',') || 'all'}`;

    const cached = await this.cacheService.get<ReactionCount[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.reactionCountRepository
      .createQueryBuilder('count')
      .where('count.subjectType = :subjectType', { subjectType })
      .andWhere('count.subjectId = :subjectId', { subjectId });

    if (kinds && kinds.length > 0) {
      query.andWhere('count.kind IN (:...kinds)', { kinds });
    }

    const counts = await query.getMany();

    await this.cacheService.set(cacheKey, counts, 60);

    return counts;
  }

  async getCountsBatch(dto: BatchCountsDto): Promise<ReactionCount[]> {
    const { subjectType, subjectIds, kinds } = dto;
    const cacheKey = `reactions:counts:batch:${subjectType}:${subjectIds.join(',')}:${kinds?.join(',') || 'all'}`;

    const cached = await this.cacheService.get<ReactionCount[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.reactionCountRepository
      .createQueryBuilder('count')
      .where('count.subjectType = :subjectType', { subjectType })
      .andWhere('count.subjectId IN (:...subjectIds)', { subjectIds });

    if (kinds && kinds.length > 0) {
      query.andWhere('count.kind IN (:...kinds)', { kinds });
    }

    const counts = await query.getMany();

    await this.cacheService.set(cacheKey, counts, 60);

    return counts;
  }

  private async updateCount(
    manager: EntityManager,
    subjectType: string,
    subjectId: string,
    kind: string,
    delta: number,
  ): Promise<void> {
    const count = await manager.findOne(ReactionCount, {
      where: { subjectType, subjectId, kind },
    });

    if (count) {
      await manager.update(
        ReactionCount,
        { subjectType, subjectId, kind },
        {
          count: Math.max(0, count.count + delta),
        },
      );
    } else if (delta > 0) {
      await manager.save(ReactionCount, {
        subjectType,
        subjectId,
        kind,
        count: delta,
      });
    }

    // Clear related cache
    await this.cacheService.deleteKeysByPattern(
      `reactions:counts:${subjectType}:${subjectId}:*`,
    );
    await this.cacheService.deleteKeysByPattern(
      `reactions:counts:batch:${subjectType}:*`,
    );
  }

  private async getCount(
    subjectType: string,
    subjectId: string,
    kind: string,
  ): Promise<number> {
    const count = await this.reactionCountRepository.findOne({
      where: { subjectType, subjectId, kind },
    });

    return count?.count || 0;
  }
}
