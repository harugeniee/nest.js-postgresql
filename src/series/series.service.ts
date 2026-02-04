import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { generateJobId } from 'src/common/utils';
import { ReactionCount } from 'src/reactions/entities/reaction-count.entity';
import { ReactionsService } from 'src/reactions/reactions.service';
import { JOB_NAME, SERIES_CONSTANTS } from 'src/shared/constants';
import { CacheService, RabbitMQService } from 'src/shared/services';
import {
  DeepPartial,
  FindOptionsRelations,
  FindOptionsSelect,
  Repository,
} from 'typeorm';
import { Series } from './entities/series.entity';
import {
  JikanSyncOneSeriesJob,
  SeriesSaveJob,
} from './services/series-queue.interface';

@Injectable()
export class SeriesService extends BaseService<Series> {
  private readonly relationsWhitelist: FindOptionsRelations<Series>;
  private readonly selectWhitelist: FindOptionsSelect<Series> | undefined;
  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    cacheService: CacheService,
    private readonly reactionsService: ReactionsService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    super(
      new TypeOrmBaseRepository<Series>(seriesRepository),
      {
        entityName: 'Series',
        cache: { enabled: true, ttlSec: 60, prefix: 'series', swrSec: 30 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          genres: {
            genre: true,
          },
          authorRoles: {
            author: true,
          },
          characters: true,
          staffRoles: {
            staff: true,
          },
          studioRoles: {
            studio: true,
          },
          tags: true,
          coverImage: true,
          bannerImage: true,
        },
        selectWhitelist: {
          id: true,
          myAnimeListId: true,
          aniListId: true,
          title: true,
          type: true,
          format: true,
          status: true,
          description: true,
          startDate: true,
          endDate: true,
          season: true,
          seasonYear: true,
          seasonInt: true,
          episodes: true,
          duration: true,
          chapters: true,
          volumes: true,
          countryOfOrigin: true,
          isLicensed: true,
          source: true,
          coverImageUrls: true,
          coverImage: {
            id: true,
            url: true,
            type: true,
          },
          bannerImageUrl: true,
          bannerImage: {
            id: true,
            url: true,
            type: true,
          },
          synonyms: true,
          averageScore: true,
          meanScore: true,
          popularity: true,
          isLocked: true,
          trending: true,
          isNsfw: true,
          autoCreateForumThread: true,
          isRecommendationBlocked: true,
          isReviewBlocked: true,
          notes: true,
          releasingStatus: true,
          externalLinks: true,
          streamingEpisodes: true,
          // metadata: true,
          createdAt: true,
          updatedAt: true,
          genres: {
            id: true,
            sortOrder: true,
            isPrimary: true,
            notes: true,
            genre: {
              id: true,
              slug: true,
              name: true,
              icon: true,
              color: true,
            },
          },
          authorRoles: {
            id: true,
            role: true,
            notes: true,
            isMain: true,
            sortOrder: true,
            author: {
              id: true,
              name: true,
            },
          },
          characters: {
            id: true,
            name: true,
            image: {
              id: true,
              url: true,
            },
          },
          staffRoles: {
            id: true,
            role: true,
            notes: true,
            isMain: true,
            sortOrder: true,
            staff: {
              id: true,
              name: true,
              image: {
                id: true,
                url: true,
              },
            },
          },
          studioRoles: {
            id: true,
            role: true,
            roleNotes: true,
            isMain: true,
            sortOrder: true,
            studio: {
              id: true,
              name: true,
              type: true,
            },
          },
          tags: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      cacheService,
    );
    this.relationsWhitelist = {
      genres: {
        genre: true,
      },
    };
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): any[] {
    return ['description', 'title:jsonb'];
  }

  /**
   * Lifecycle hook: before creating a series
   * Normalize and validate data before creation
   */
  protected async beforeCreate(
    data: DeepPartial<Series>,
  ): Promise<DeepPartial<Series>> {
    // Ensure popularity defaults to 0
    if (data.popularity === undefined) {
      data.popularity = 0;
    }

    // Ensure trending defaults to 0
    if (data.trending === undefined) {
      data.trending = 0;
    }

    // Ensure isLocked defaults to false
    if (data.isLocked === undefined) {
      data.isLocked = false;
    }

    // Ensure isNsfw defaults to false
    if (data.isNsfw === undefined) {
      data.isNsfw = false;
    }

    return data;
  }

  /**
   * Lifecycle hook: after creating a series
   * Handle post-creation side effects
   */
  protected async afterCreate(_entity: Series): Promise<void> {
    // Could emit events, send notifications, etc.
    // For now, BaseService handles cache invalidation
  }

  /**
   * Lifecycle hook: before updating a series
   */
  protected async beforeUpdate(
    _id: string,
    _patch: DeepPartial<Series>,
  ): Promise<void> {
    // Validation or normalization can be added here
  }

  /**
   * Lifecycle hook: after updating a series
   */
  protected async afterUpdate(_entity: Series): Promise<void> {
    // Handle post-update side effects
  }

  /**
   * Lifecycle hook: before deleting a series
   */
  protected async beforeDelete(_id: string): Promise<void> {
    // Pre-deletion checks
  }

  /**
   * Lifecycle hook: after deleting a series
   */
  protected async afterDelete(_id: string): Promise<void> {
    // Post-deletion cleanup
  }

  /**
   * Get all series with offset pagination
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Series>> {
    return this.listOffset(paginationDto, undefined, {
      relations: this.relationsWhitelist,
    });
  }

  /**
   * Get all series with cursor pagination
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Series>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get reaction counts for a series
   * Uses ReactionsService to get counts for different reaction kinds
   * @param seriesId Series ID
   * @param kinds Optional array of reaction kinds to filter (e.g., ['like', 'favourite'])
   * @returns Array of ReactionCount objects
   */
  async getReactionCounts(
    seriesId: string,
    kinds?: string[],
  ): Promise<ReactionCount[]> {
    return this.reactionsService.getCounts('series', seriesId, kinds);
  }

  /**
   * Check if a user has reacted to a series with a specific kind
   * @param userId User ID
   * @param seriesId Series ID
   * @param kind Reaction kind (e.g., 'like', 'favourite')
   * @returns True if user has reacted, false otherwise
   */
  async hasReacted(
    userId: string,
    seriesId: string,
    kind: string,
  ): Promise<boolean> {
    return this.reactionsService.hasReacted(userId, 'series', seriesId, kind);
  }

  /**
   * Get a series by ID with reaction counts
   * @param id Series ID
   * @param kinds Optional array of reaction kinds to include
   * @returns Series with reaction counts or null if not found
   */
  async findByIdWithReactions(
    id: string,
    kinds?: string[],
  ): Promise<(Series & { reactionCounts?: ReactionCount[] }) | null> {
    const series = await this.findById(id);
    if (!series) {
      return null;
    }

    const reactionCounts = await this.getReactionCounts(id, kinds);
    return {
      ...series,
      reactionCounts,
    } as Series & { reactionCounts?: ReactionCount[] };
  }

  /**
   * Queue a sync job for a series from external source (Jikan/AniList)
   *
   * If source is not provided, auto-detect:
   * - Priority: aniListId -> myAnimeListId
   * - If neither exists, return 400 error
   *
   * @param seriesId Internal series ID
   * @param source Optional source to sync from ('jikan' or 'anilist')
   * @returns Job ID and resolved source
   */
  async queueSyncFromExternal(
    seriesId: string,
    source?: 'jikan' | 'anilist',
  ): Promise<{ jobId: string; source: 'jikan' | 'anilist' }> {
    // 1. Get series
    const series = await this.findById(seriesId);
    if (!series) {
      throw new HttpException(
        { messageKey: 'series.NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Determine source (auto-detect if not provided)
    let resolvedSource: 'jikan' | 'anilist';

    if (source) {
      // User specified source - validate corresponding ID exists
      resolvedSource = source;
      if (source === 'anilist' && !series.aniListId) {
        throw new HttpException(
          { messageKey: 'series.MISSING_ANILIST_ID' },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (source === 'jikan' && !series.myAnimeListId) {
        throw new HttpException(
          { messageKey: 'series.MISSING_MAL_ID' },
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (series.aniListId) {
      // Auto-detect: prioritize aniListId -> myAnimeListId
      resolvedSource = 'anilist';
    } else if (series.myAnimeListId) {
      resolvedSource = 'jikan';
    } else {
      throw new HttpException(
        { messageKey: 'series.NO_EXTERNAL_ID' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Create and send job
    const jobId = generateJobId();
    const timestamp = new Date().toISOString();

    if (resolvedSource === 'jikan') {
      // Determine type from series.type
      const type =
        series.type === SERIES_CONSTANTS.TYPE.ANIME ? 'ANIME' : 'MANGA';

      const job: JikanSyncOneSeriesJob = {
        jobId,
        seriesId,
        myAnimeListId: series.myAnimeListId!,
        type,
        timestamp,
      };

      this.rabbitMQService.sendDataToRabbitMQ(
        JOB_NAME.JIKAN_SYNC_ONE_SERIES,
        job,
      );
    } else {
      const job: SeriesSaveJob = {
        jobId,
        aniListId: Number.parseInt(series.aniListId!, 10),
        timestamp,
      };

      this.rabbitMQService.sendDataToRabbitMQ(JOB_NAME.SERIES_SAVE, job);
    }

    return { jobId, source: resolvedSource };
  }
}
