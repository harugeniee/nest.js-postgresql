import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { JOB_NAME } from 'src/shared/constants';
import { CacheService, RabbitMQService } from 'src/shared/services';
import { JikanCrawlService } from './jikan-crawl.service';
import {
  JikanSyncOneSeriesJob,
  JikanSyncTopJob,
} from './series-queue.interface';

/** Redis key: set by worker when Jikan sync job is running; cron skips sending if present. TTL 2h. */
const JIKAN_SYNC_IN_PROGRESS_KEY = 'jikan:sync:in_progress';
/** Redis key: set when Jikan API returns 429; cron skips until after blocked_until (timestamp ms). TTL ~60–120s. */
const JIKAN_RATE_LIMIT_BLOCKED_UNTIL_KEY = 'jikan:rate_limit:blocked_until';

/** Number of JIKAN_SYNC_ONE_SERIES jobs to send per minute (under 60 req/min Jikan limit). */
const SYNC_EXISTING_BATCH_SIZE_PER_MINUTE = 20;

/**
 * Jikan Series Cronjob Service
 *
 * Schedules periodic sync of anime and manga from Jikan API.
 * Runs daily at 2:00 AM: checks Redis (rate limit / in-progress), then enqueues two jobs
 * (sync top 100 anime, sync top 100 manga) to RabbitMQ. Worker processes jobs and syncs
 * data (create or update by myAnimeListId).
 */
@Injectable()
export class JikanSeriesCronjobService {
  private readonly logger = new Logger(JikanSeriesCronjobService.name);

  constructor(
    private readonly jikanCrawlService: JikanCrawlService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Cron: runs daily at 2:00 AM.
   * Before sending jobs: checks Redis for jikan:sync:in_progress and jikan:rate_limit:blocked_until.
   * Only if both checks pass, sends JIKAN_SYNC_TOP_ANIME and JIKAN_SYNC_TOP_MANGA jobs to RabbitMQ.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async syncFromJikan(): Promise<void> {
    this.logger.log('Starting Jikan API series sync cronjob (2:00 AM)');

    try {
      // Check if a Jikan sync is already in progress (worker sets this)
      const inProgress = await this.cacheService.get(
        JIKAN_SYNC_IN_PROGRESS_KEY,
      );
      if (inProgress) {
        this.logger.warn(
          'Jikan sync already in progress (jikan:sync:in_progress), skipping this run',
        );
        return;
      }

      // Check if we are in rate-limit backoff (worker sets this on 429)
      const blockedUntilRaw = await this.cacheService.get(
        JIKAN_RATE_LIMIT_BLOCKED_UNTIL_KEY,
      );
      if (blockedUntilRaw) {
        const blockedUntil = Number.parseInt(blockedUntilRaw as string, 10);
        if (!Number.isNaN(blockedUntil) && Date.now() < blockedUntil) {
          this.logger.warn(
            `Jikan rate limited (jikan:rate_limit:blocked_until), skip until ${new Date(blockedUntil).toISOString()}`,
          );
          return;
        }
      }

      const limit = 100;
      const timestamp = new Date().toISOString();

      const animeJob: JikanSyncTopJob = {
        jobId: randomUUID(),
        limit,
        timestamp,
      };
      const mangaJob: JikanSyncTopJob = {
        jobId: randomUUID(),
        limit,
        timestamp,
      };

      await this.rabbitMQService.sendDataToRabbitMQAsync(
        JOB_NAME.JIKAN_SYNC_TOP_ANIME,
        animeJob,
      );
      await this.rabbitMQService.sendDataToRabbitMQAsync(
        JOB_NAME.JIKAN_SYNC_TOP_MANGA,
        mangaJob,
      );

      this.logger.log(
        `Enqueued Jikan sync jobs: anime ${animeJob.jobId}, manga ${mangaJob.jobId}`,
      );

      // Refresh Redis LIST of series pending sync (for cron every minute to consume)
      const pendingCount =
        await this.jikanCrawlService.refreshSyncExistingPendingList();
      this.logger.log(
        `Refreshed sync existing pending list: ${pendingCount} items`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Jikan API series sync cronjob failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Cron: runs every minute.
   * Checks rate limit (blocked_until), then pops N items from Redis LIST jikan:sync_existing:pending,
   * sends N JIKAN_SYNC_ONE_SERIES jobs to RabbitMQ, and trims the list (removes sent items).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendExistingSyncJobsEveryMinute(): Promise<void> {
    try {
      const blockedUntilRaw = await this.cacheService.get(
        JIKAN_RATE_LIMIT_BLOCKED_UNTIL_KEY,
      );
      if (blockedUntilRaw) {
        const blockedUntil = Number.parseInt(blockedUntilRaw as string, 10);
        if (!Number.isNaN(blockedUntil) && Date.now() < blockedUntil) {
          this.logger.debug(
            `Jikan rate limited, skip sendExistingSyncJobs until ${new Date(blockedUntil).toISOString()}`,
          );
          return;
        }
      }

      const key = JikanCrawlService.JIKAN_SYNC_EXISTING_PENDING_KEY;
      const N = SYNC_EXISTING_BATCH_SIZE_PER_MINUTE;
      /* CacheService.listRange returns Promise<string[]>; DI can make the call appear unsafe to ESLint. */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const items: string[] = await this.cacheService.listRange(key, 0, N - 1);

      if (items.length === 0) {
        return;
      }

      const timestamp = new Date().toISOString();
      for (const itemStr of items) {
        try {
          const item = JSON.parse(itemStr) as {
            seriesId: string;
            myAnimeListId: string;
            type: 'ANIME' | 'MANGA';
          };
          const job: JikanSyncOneSeriesJob = {
            jobId: randomUUID(),
            seriesId: item.seriesId,
            myAnimeListId: item.myAnimeListId,
            type: item.type,
            timestamp,
          };
          await this.rabbitMQService.sendDataToRabbitMQAsync(
            JOB_NAME.JIKAN_SYNC_ONE_SERIES,
            job,
          );
        } catch (parseErr) {
          this.logger.warn(
            `Invalid pending item JSON, skip: ${itemStr}`,
            parseErr instanceof Error ? parseErr.message : String(parseErr),
          );
        }
      }

      /* CacheService methods; DI can make calls appear unsafe to ESLint. */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.cacheService.listTrim(key, items.length, -1);

      /* CacheService.listLength returns Promise<number>; DI can make the call appear unsafe to ESLint. */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const remaining: number = await this.cacheService.listLength(key);
      this.logger.log(
        `sendExistingSyncJobsEveryMinute: sent ${items.length} jobs, ${remaining} remaining in list`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `sendExistingSyncJobsEveryMinute failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Manual sync for testing or on-demand updates.
   * Runs in-process (calls JikanCrawlService directly); does not check Redis or enqueue.
   * Use for admin/API-triggered sync. Optional enqueue can be added later.
   *
   * @param options - Sync options (syncExisting, syncTopAnime, syncTopManga, topLimit)
   * @returns Promise with sync statistics
   */
  async manualSync(options?: {
    syncExisting?: boolean;
    syncTopAnime?: boolean;
    syncTopManga?: boolean;
    topLimit?: number;
  }): Promise<{
    existing?: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
    };
    topAnime?: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
    };
    topManga?: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
    };
  }> {
    this.logger.log('Starting manual Jikan API series sync');

    const results: {
      existing?: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
      };
      topAnime?: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
      };
      topManga?: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
      };
    } = {};

    try {
      const topLimit = options?.topLimit ?? 100;

      if (options?.syncExisting !== false) {
        this.logger.log('Syncing existing series with myAnimeListId');
        results.existing = await this.jikanCrawlService.syncExistingSeries();
        this.logger.log(
          `Existing series sync completed: ${JSON.stringify(results.existing)}`,
        );
      }

      if (options?.syncTopAnime !== false) {
        this.logger.log(`Syncing top ${topLimit} anime`);
        results.topAnime = await this.jikanCrawlService.syncTopAnime(topLimit);
        this.logger.log(
          `Top anime sync completed: ${JSON.stringify(results.topAnime)}`,
        );
      }

      if (options?.syncTopManga !== false) {
        this.logger.log(`Syncing top ${topLimit} manga`);
        results.topManga = await this.jikanCrawlService.syncTopManga(topLimit);
        this.logger.log(
          `Top manga sync completed: ${JSON.stringify(results.topManga)}`,
        );
      }

      this.logger.log('Manual Jikan API series sync completed');
      return results;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Manual Jikan API series sync failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
