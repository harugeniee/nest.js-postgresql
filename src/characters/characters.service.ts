import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { CHARACTER_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { DeepPartial, Repository, IsNull, Not } from 'typeorm';
import { CharacterStatsDto, QueryCharacterCursorDto } from './dto';
import { Character } from './entities/character.entity';
import { CharacterStaff } from './entities/character-staff.entity';

@Injectable()
export class CharactersService extends BaseService<Character> {
  constructor(
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
    @InjectRepository(CharacterStaff)
    private readonly characterStaffRepository: Repository<CharacterStaff>,
    @InjectRepository(ReactionCount)
    private readonly reactionCountRepository: Repository<ReactionCount>,
    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
  ) {
    super(
      new TypeOrmBaseRepository<Character>(characterRepository),
      {
        entityName: 'Character',
        cache: { enabled: true, ttlSec: 60, prefix: 'characters', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          voiceActors: {
            staff: true,
          },
        },
        selectWhitelist: {
          id: true,
          seriesId: true,
          name: true,
          image: true,
          description: true,
          gender: true,
          dateOfBirth: true,
          age: true,
          bloodType: true,
          siteUrl: true,
          notes: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Define which fields can be searched
   * Since name is JSONB, we'll search in the name object fields
   */
  protected getSearchableColumns(): (keyof Character)[] {
    return ['description', 'gender', 'age'];
  }

  /**
   * Lifecycle hook: before creating a character
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Character>,
  ): Promise<DeepPartial<Character>> {
    // Data normalization can be added here if needed
    return data;
  }

  /**
   * Lifecycle hook: after creating a character
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Character): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a character
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Character>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a character
   */
  protected async afterUpdate(_entity: Character): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a character
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a character
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Get all characters with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Character>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all characters with cursor pagination
   */
  async findAllCursor(
    queryDto: QueryCharacterCursorDto,
  ): Promise<IPaginationCursor<Character>> {
    const extraFilter: Record<string, unknown> = {};
    const { seriesId } = queryDto;
    if (seriesId) {
      extraFilter.seriesId = seriesId;
    }
    return this.listCursor(queryDto, extraFilter, {
      relations: {
        voiceActors: {
          staff: true,
        },
      },
    });
  }

  /**
   * Get reaction counts for a character
   * Uses ReactionsService to get counts for different reaction kinds
   * @param characterId Character ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    characterId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('character', characterId, kinds);
  }

  /**
   * Check if a user has reacted to a character with a specific kind
   * @param userId User ID
   * @param characterId Character ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    characterId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(
      userId,
      'character',
      characterId,
      kind,
    );
  }

  /**
   * Get a character by ID with reaction counts
   * @param id Character ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Character with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Character & { reactionCounts?: ReactionCount[] }) | null> {
    const character = await this.findById(id);
    if (!character) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...character,
      reactionCounts,
    } as Character & { reactionCounts?: ReactionCount[] };
  }

  /**
   * Get comprehensive character statistics
   * Returns aggregated statistics about characters including counts by status, gender, blood type,
   * voice actors, reactions, and top series
   * @returns Character statistics DTO
   */
  async getCharacterStatistics(): Promise<CharacterStatsDto> {
    const cacheKey = 'characters:stats:overview';
    const cached = await this.cacheService?.get(cacheKey);
    if (cached) {
      return cached as CharacterStatsDto;
    }

    // Execute all queries in parallel for better performance
    const [
      totalCharacters,
      activeCharacters,
      statusStats,
      genderStats,
      bloodTypeStats,
      charactersWithImages,
      charactersWithVoiceActors,
      totalVoiceActors,
      totalReactions,
      seriesStats,
    ] = await Promise.all([
      // Total characters count
      this.characterRepository.count(),

      // Active characters count
      this.characterRepository.count({
        where: { status: CHARACTER_CONSTANTS.STATUS.ACTIVE },
      }),

      // Characters by status
      this.characterRepository
        .createQueryBuilder('character')
        .select('character.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('character.status')
        .getRawMany(),

      // Characters by gender
      this.characterRepository
        .createQueryBuilder('character')
        .select('character.gender', 'gender')
        .addSelect('COUNT(*)', 'count')
        .where('character.gender IS NOT NULL')
        .groupBy('character.gender')
        .getRawMany(),

      // Characters by blood type
      this.characterRepository
        .createQueryBuilder('character')
        .select('character.bloodType', 'bloodType')
        .addSelect('COUNT(*)', 'count')
        .where('character.bloodType IS NOT NULL')
        .groupBy('character.bloodType')
        .getRawMany(),

      // Characters with images
      this.characterRepository.count({
        where: { imageId: Not(IsNull()) },
      }),

      // Characters with voice actors (distinct character IDs from character_staff)
      this.characterStaffRepository
        .createQueryBuilder('cs')
        .select('COUNT(DISTINCT cs.characterId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result?.count || '0', 10)),

      // Total voice actor relationships
      this.characterStaffRepository.count(),

      // Total reactions for all characters
      this.reactionCountRepository
        .createQueryBuilder('rc')
        .select('SUM(rc.count)', 'total')
        .where('rc.subjectType = :subjectType', { subjectType: 'character' })
        .getRawOne()
        .then((result) => parseInt(result?.total || '0', 10)),

      // Top series by character count
      this.characterRepository
        .createQueryBuilder('character')
        .select('character.seriesId', 'seriesId')
        .addSelect('COUNT(*)', 'count')
        .where('character.seriesId IS NOT NULL')
        .groupBy('character.seriesId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    // Transform status stats to Record<string, number>
    const charactersByStatus = (
      statusStats as Array<{ status: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.status] = parseInt(stat.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Transform gender stats to Record<string, number>
    const charactersByGender = (
      genderStats as Array<{ gender: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.gender] = parseInt(stat.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Transform blood type stats to Record<string, number>
    const charactersByBloodType = (
      bloodTypeStats as Array<{ bloodType: string; count: string }>
    ).reduce(
      (acc, stat) => {
        acc[stat.bloodType] = parseInt(stat.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Transform series stats to Array<{ seriesId: string; count: number }>
    const charactersBySeries = (
      seriesStats as Array<{ seriesId: string; count: string }>
    ).map((stat) => ({
      seriesId: stat.seriesId,
      count: parseInt(stat.count, 10),
    }));

    const stats: CharacterStatsDto = {
      totalCharacters,
      activeCharacters,
      charactersByStatus,
      charactersByGender,
      charactersByBloodType,
      charactersWithImages,
      charactersWithVoiceActors,
      totalVoiceActors,
      totalReactions,
      charactersBySeries,
    };

    // Cache the results
    await this.cacheService?.set(
      cacheKey,
      stats,
      CHARACTER_CONSTANTS.CACHE.STATS_TTL_SEC,
    );

    return stats;
  }
}
