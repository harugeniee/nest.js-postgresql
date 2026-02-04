import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createSlug } from 'src/common/utils';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { Genre, SeriesGenre } from '../entities';
import { Series } from '../entities/series.entity';
import { JikanApiService } from './jikan-api.service';
import { JikanMapperService } from './jikan-mapper.service';
import { JikanAnimeData, JikanMangaData } from './jikan.types';

/**
 * Jikan Crawl Service
 *
 * Service for crawling and syncing anime/manga data from Jikan API
 * Handles batch processing, sync state tracking, and data persistence
 */
@Injectable()
export class JikanCrawlService {
  private readonly logger = new Logger(JikanCrawlService.name);
  private readonly BATCH_SIZE = 50; // Process series in batches
  private readonly SYNC_STATE_CACHE_KEY_PREFIX = 'jikan:sync_state:';

  /** Redis LIST key for pending series to sync (refreshSyncExistingPendingList / cron every minute). */
  static readonly JIKAN_SYNC_EXISTING_PENDING_KEY =
    'jikan:sync_existing:pending';

  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(SeriesGenre)
    private readonly seriesGenreRepository: Repository<SeriesGenre>,
    private readonly jikanApiService: JikanApiService,
    private readonly jikanMapperService: JikanMapperService,
    private readonly dataSource: DataSource,
    private readonly cacheService?: CacheService,
  ) {}

  /**
   * Sync a single anime by MyAnimeList ID
   *
   * @param malId - MyAnimeList anime ID
   * @returns Promise with synced Series entity or null if not found
   */
  async syncAnimeById(malId: number): Promise<Series | null> {
    try {
      this.logger.debug(`Syncing anime ${malId} from Jikan API`);

      // Fetch anime data from Jikan API
      const jikanData = await this.jikanApiService.getAnimeFullById(malId);

      // Map to Series entity
      const seriesData = this.jikanMapperService.mapAnimeToSeries(jikanData);

      // Save or update series
      const savedSeries = await this.saveOrUpdateSeries(seriesData, jikanData);

      this.logger.log(
        `Successfully synced anime ${malId} -> Series ${savedSeries.id}`,
      );

      return savedSeries;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync anime ${malId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Sync a single manga by MyAnimeList ID
   *
   * @param malId - MyAnimeList manga ID
   * @returns Promise with synced Series entity or null if not found
   */
  async syncMangaById(malId: number): Promise<Series | null> {
    try {
      this.logger.debug(`Syncing manga ${malId} from Jikan API`);

      // Fetch manga data from Jikan API
      const jikanData = await this.jikanApiService.getMangaFullById(malId);

      // Map to Series entity
      const seriesData = this.jikanMapperService.mapMangaToSeries(jikanData);

      // Save or update series
      const savedSeries = await this.saveOrUpdateSeries(seriesData, jikanData);

      this.logger.log(
        `Successfully synced manga ${malId} -> Series ${savedSeries.id}`,
      );

      return savedSeries;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync manga ${malId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Refresh the Redis LIST of series pending sync (myAnimeListId).
   * Query all series with myAnimeListId, replace the list with current data.
   * Called by cron (e.g. daily at 2 AM); cron every minute then pops N items and sends jobs.
   *
   * @returns Promise with number of items pushed to the list (0 if no CacheService or no series)
   */
  async refreshSyncExistingPendingList(): Promise<number> {
    if (!this.cacheService) {
      this.logger.warn(
        'CacheService not available, skip refreshSyncExistingPendingList',
      );
      return 0;
    }

    const allSeries = await this.seriesRepository
      .createQueryBuilder('series')
      .where('series.myAnimeListId IS NOT NULL')
      .andWhere("series.myAnimeListId != ''")
      .select(['series.id', 'series.myAnimeListId', 'series.type'])
      .getMany();

    if (allSeries.length === 0) {
      this.logger.log(
        'No series with myAnimeListId found, clearing pending list',
      );
      await this.cacheService.delete(
        JikanCrawlService.JIKAN_SYNC_EXISTING_PENDING_KEY,
      );
      return 0;
    }

    const key = JikanCrawlService.JIKAN_SYNC_EXISTING_PENDING_KEY;
    await this.cacheService.delete(key);

    for (const series of allSeries) {
      if (!series.myAnimeListId || !series.type) continue;
      const item = JSON.stringify({
        seriesId: series.id,
        myAnimeListId: series.myAnimeListId,
        type: series.type,
      });
      /* CacheService.listPush; DI can make the call appear unsafe to ESLint. */

      await this.cacheService.listPush(key, item);
    }

    this.logger.log(
      `refreshSyncExistingPendingList: pushed ${allSeries.length} items to ${key}`,
    );
    return allSeries.length;
  }

  /**
   * Sync all existing series that have a myAnimeListId
   * Updates series data from Jikan API
   *
   * @returns Promise with sync statistics
   */
  async syncExistingSeries(): Promise<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log('Starting sync of existing series with myAnimeListId');

    try {
      // Query for series with myAnimeListId
      const allSeries = await this.seriesRepository
        .createQueryBuilder('series')
        .where('series.myAnimeListId IS NOT NULL')
        .andWhere("series.myAnimeListId != ''")
        .select(['series.id', 'series.myAnimeListId', 'series.type'])
        .getMany();

      if (allSeries.length === 0) {
        this.logger.log('No series with myAnimeListId found');
        return { total: 0, processed: 0, successful: 0, failed: 0 };
      }

      this.logger.log(
        `Found ${allSeries.length} series with myAnimeListId to sync`,
      );

      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Process in batches
      for (let i = 0; i < allSeries.length; i += this.BATCH_SIZE) {
        const batch = allSeries.slice(i, i + this.BATCH_SIZE);

        for (const series of batch) {
          try {
            if (!series.myAnimeListId) {
              continue;
            }

            const malId = parseInt(series.myAnimeListId, 10);
            if (isNaN(malId)) {
              this.logger.warn(
                `Invalid myAnimeListId for series ${series.id}: ${series.myAnimeListId}`,
              );
              failed++;
              processed++;
              continue;
            }

            // Sync based on type
            if (series.type === SERIES_CONSTANTS.TYPE.ANIME) {
              const result = await this.syncAnimeById(malId);
              if (result) {
                successful++;
              } else {
                failed++;
              }
            } else if (series.type === SERIES_CONSTANTS.TYPE.MANGA) {
              const result = await this.syncMangaById(malId);
              if (result) {
                successful++;
              } else {
                failed++;
              }
            } else {
              this.logger.warn(
                `Unknown series type for series ${series.id}: ${series.type}`,
              );
              failed++;
            }

            processed++;
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Error syncing series ${series.id}: ${errorMessage}`,
            );
            failed++;
            processed++;
          }
        }

        // Log progress
        if (allSeries.length > this.BATCH_SIZE) {
          this.logger.log(
            `Progress: ${processed}/${allSeries.length} (${successful} successful, ${failed} failed)`,
          );
        }

        // Small delay between batches to avoid overwhelming the API
        if (i + this.BATCH_SIZE < allSeries.length) {
          await this.delay(1000); // 1 second delay between batches
        }
      }

      this.logger.log(
        `Sync completed: ${processed} processed, ${successful} successful, ${failed} failed`,
      );

      return { total: allSeries.length, processed, successful, failed };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync existing series: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sync top anime from Jikan API
   *
   * @param limit - Maximum number of anime to sync (default: 100)
   * @returns Promise with sync statistics
   */
  async syncTopAnime(limit: number = 100): Promise<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log(`Starting sync of top ${limit} anime from Jikan API`);

    try {
      let processed = 0;
      let successful = 0;
      let failed = 0;
      let page = 1;
      const perPage = 25; // Jikan API default

      while (processed < limit) {
        const remaining = limit - processed;
        const currentLimit = Math.min(remaining, perPage);

        // Fetch top anime
        const response = await this.jikanApiService.getTopAnime({
          page,
          limit: currentLimit,
        });

        if (!response.data || response.data.length === 0) {
          break; // No more data
        }

        // Process each anime
        for (const animeData of response.data) {
          if (processed >= limit) {
            break;
          }

          try {
            const result = await this.syncAnimeById(animeData.mal_id);
            if (result) {
              successful++;
            } else {
              failed++;
            }
            processed++;
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Error syncing anime ${animeData.mal_id}: ${errorMessage}`,
            );
            failed++;
            processed++;
          }
        }

        // Check if there's more data
        if (!response.pagination?.has_next_page || processed >= limit) {
          break;
        }

        page++;
        await this.delay(500); // Small delay between pages
      }

      this.logger.log(
        `Top anime sync completed: ${processed} processed, ${successful} successful, ${failed} failed`,
      );

      return { total: limit, processed, successful, failed };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync top anime: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sync top manga from Jikan API
   *
   * @param limit - Maximum number of manga to sync (default: 100)
   * @returns Promise with sync statistics
   */
  async syncTopManga(limit: number = 100): Promise<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log(`Starting sync of top ${limit} manga from Jikan API`);

    try {
      let processed = 0;
      let successful = 0;
      let failed = 0;
      let page = 1;
      const perPage = 25; // Jikan API default

      while (processed < limit) {
        const remaining = limit - processed;
        const currentLimit = Math.min(remaining, perPage);

        // Fetch top manga
        const response = await this.jikanApiService.getTopManga({
          page,
          limit: currentLimit,
        });

        if (!response.data || response.data.length === 0) {
          break; // No more data
        }

        // Process each manga
        for (const mangaData of response.data) {
          if (processed >= limit) {
            break;
          }

          try {
            const result = await this.syncMangaById(mangaData.mal_id);
            if (result) {
              successful++;
            } else {
              failed++;
            }
            processed++;
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Error syncing manga ${mangaData.mal_id}: ${errorMessage}`,
            );
            failed++;
            processed++;
          }
        }

        // Check if there's more data
        if (!response.pagination?.has_next_page || processed >= limit) {
          break;
        }

        page++;
        await this.delay(500); // Small delay between pages
      }

      this.logger.log(
        `Top manga sync completed: ${processed} processed, ${successful} successful, ${failed} failed`,
      );

      return { total: limit, processed, successful, failed };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync top manga: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Save or update a series in the database
   * Handles genres relationship
   *
   * @param seriesData - Series data to save
   * @param jikanData - Original Jikan data for genres
   * @returns Promise with saved Series entity
   */
  private async saveOrUpdateSeries(
    seriesData: Partial<Series>,
    jikanData: JikanAnimeData | JikanMangaData,
  ): Promise<Series> {
    if (!seriesData.myAnimeListId) {
      throw new Error('myAnimeListId is required to save series');
    }

    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async (manager) => {
      // Find existing series by myAnimeListId
      const existingSeries = await manager.findOne(Series, {
        where: { myAnimeListId: seriesData.myAnimeListId },
      });

      let savedSeries: Series;

      if (existingSeries) {
        // Update existing series
        Object.assign(existingSeries, seriesData);
        savedSeries = await manager.save(Series, existingSeries);
      } else {
        // Create new series
        const newSeries = manager.create(Series, seriesData);
        savedSeries = await manager.save(Series, newSeries);
      }

      // Process genres
      await this.processSeriesGenres(manager, savedSeries, jikanData);

      return savedSeries;
    });
  }

  /**
   * Process and save genres for a series
   * Creates genres if they don't exist and links them via SeriesGenre junction table
   */
  private async processSeriesGenres(
    manager: EntityManager,
    series: Series,
    jikanData: JikanAnimeData | JikanMangaData,
  ): Promise<void> {
    // Combine all genre types from Jikan
    const allGenres = [
      ...(jikanData.genres || []),
      ...(jikanData.explicit_genres || []),
      ...(jikanData.themes || []),
      ...(jikanData.demographics || []),
    ];

    if (allGenres.length === 0) {
      return;
    }

    // Remove existing genre relations for this series
    await manager.delete(SeriesGenre, { seriesId: series.id });

    // Process each genre - create if doesn't exist
    for (let index = 0; index < allGenres.length; index++) {
      const jikanGenre = allGenres[index];
      if (!jikanGenre || !jikanGenre.name) continue;

      const genreName = jikanGenre.name;

      // Find or create genre by slug
      let genre = await manager.findOne(Genre, {
        where: { slug: createSlug(genreName) },
      });

      if (!genre) {
        // Create new genre if it doesn't exist
        genre = manager.create(Genre, {
          slug: createSlug(genreName),
          name: genreName,
          sortOrder: index,
          isNsfw: false, // Default to false
        });
        genre = await manager.save(Genre, genre);
        this.logger.debug(
          `Created new genre "${genreName}" (slug: ${createSlug(genreName)}) for series ${series.id}`,
        );
      }

      // Create SeriesGenre relation to link series with genre
      const seriesGenre = manager.create(SeriesGenre, {
        seriesId: series.id,
        genreId: genre.id,
        sortOrder: index,
        isPrimary: index === 0, // First genre is primary
      });
      await manager.save(SeriesGenre, seriesGenre);
    }
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
