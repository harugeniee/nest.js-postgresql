import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Reaction } from './entities/reaction.entity';
import { ReactionCount } from './entities/reaction-count.entity';
import { CreateOrSetReactionDto } from './dto/create-reaction.dto';
import { QueryReactionsDto } from './dto/query-reactions.dto';
import { BatchCountsDto } from './dto/batch-counts.dto';
import { CacheService } from 'src/shared/services';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    @InjectRepository(ReactionCount)
    private readonly reactionCountRepository: Repository<ReactionCount>,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async toggle(
    userId: number,
    dto: CreateOrSetReactionDto,
  ): Promise<Reaction | null> {
    const { subjectType, subjectId, kind } = dto;

    const existingReaction = await this.reactionRepository.findOne({
      where: {
        userId,
        subjectType,
        subjectId,
        kind,
        deletedAt: undefined,
      },
    });

    if (existingReaction) {
      return this.unset(userId, dto);
    } else {
      return this.set(userId, dto);
    }
  }

  async set(userId: number, dto: CreateOrSetReactionDto): Promise<Reaction> {
    const { subjectType, subjectId, kind } = dto;

    return this.dataSource.transaction(async (manager) => {
      // Create or restore reaction
      const reaction = await manager.save(Reaction, {
        userId,
        subjectType,
        subjectId,
        kind,
        deletedAt: undefined,
      });

      // Update count
      await this.updateCount(manager, subjectType, subjectId, kind, 1);

      // Emit event
      this.eventEmitter.emit('reaction.set', {
        userId,
        subjectType,
        subjectId,
        kind,
        count: await this.getCount(subjectType, subjectId, kind),
      });

      return reaction;
    }) as Promise<Reaction>;
  }

  async unset(userId: number, dto: CreateOrSetReactionDto): Promise<null> {
    const { subjectType, subjectId, kind } = dto;

    return this.dataSource.transaction(async (manager) => {
      // Soft delete reaction
      await manager.update(
        Reaction,
        {
          userId,
          subjectType,
          subjectId,
          kind,
          deletedAt: undefined,
        },
        {
          deletedAt: new Date(),
        },
      );

      // Update count
      await this.updateCount(manager, subjectType, subjectId, kind, -1);

      // Emit event
      this.eventEmitter.emit('reaction.unset', {
        userId,
        subjectType,
        subjectId,
        kind,
        count: await this.getCount(subjectType, subjectId, kind),
      });

      return null;
    }) as Promise<null>;
  }

  async list(
    dto: QueryReactionsDto,
  ): Promise<{ reactions: Reaction[]; total: number }> {
    const { page, limit, sortBy, order, subjectType, subjectId, kind, userId } =
      dto;
    const skip = (page - 1) * limit;

    const query = this.reactionRepository
      .createQueryBuilder('reaction')
      .where('reaction.deletedAt IS NULL');

    if (subjectType) {
      query.andWhere('reaction.subjectType = :subjectType', { subjectType });
    }
    if (subjectId) {
      query.andWhere('reaction.subjectId = :subjectId', { subjectId });
    }
    if (kind) {
      query.andWhere('reaction.kind = :kind', { kind });
    }
    if (userId) {
      query.andWhere('reaction.userId = :userId', { userId });
    }

    const [reactions, total] = await query
      .orderBy(`reaction.${sortBy}`, order)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { reactions, total };
  }

  async hasReacted(
    userId: number,
    subjectType: string,
    subjectId: number,
    kind: string,
  ): Promise<boolean> {
    const reaction = await this.reactionRepository.findOne({
      where: {
        userId,
        subjectType,
        subjectId,
        kind,
        deletedAt: undefined,
      },
    });

    return !!reaction;
  }

  async getCounts(
    subjectType: string,
    subjectId: number,
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
    manager: any,
    subjectType: string,
    subjectId: number,
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
    subjectId: number,
    kind: string,
  ): Promise<number> {
    const count = await this.reactionCountRepository.findOne({
      where: { subjectType, subjectId, kind },
    });

    return count?.count || 0;
  }
}
