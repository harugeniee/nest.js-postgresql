import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JikanCrawlService } from './jikan-crawl.service';

/**
 * Jikan Series Cronjob Service
 *
 * Service for scheduling periodic syncs of anime and manga data from Jikan API
 * Runs daily at 2 AM to sync existing series and discover new popular content
 */
@Injectable()
export class JikanSeriesCronjobService {
  private readonly logger = new Logger(JikanSeriesCronjobService.name);

  constructor(private readonly jikanCrawlService: JikanCrawlService) {}

  /**
   * Cron job to sync series data from Jikan API
   * Runs every hour to sync top content
   *
   * Workflow:
   * 1. Sync top 100 anime and top 100 manga (for discovery)
   * 2. Log summary statistics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncFromJikan(): Promise<void> {
    this.logger.log('Starting Jikan API series sync cronjob');

    try {
      const startTime = Date.now();

      // Step 1: Sync existing series (temporarily disabled)
      // this.logger.log('Step 1: Syncing existing series with myAnimeListId');
      // const existingStats = await this.jikanCrawlService.syncExistingSeries();
      // this.logger.log(
      //   `Existing series sync completed: ${JSON.stringify(existingStats)}`,
      // );

      // Step 1: Sync top anime
      this.logger.log('Step 1: Syncing top 100 anime');
      const topAnimeStats = await this.jikanCrawlService.syncTopAnime(100);
      this.logger.log(
        `Top anime sync completed: ${JSON.stringify(topAnimeStats)}`,
      );

      // Step 2: Sync top manga
      this.logger.log('Step 2: Syncing top 100 manga');
      const topMangaStats = await this.jikanCrawlService.syncTopManga(100);
      this.logger.log(
        `Top manga sync completed: ${JSON.stringify(topMangaStats)}`,
      );

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Summary
      const totalProcessed = topAnimeStats.processed + topMangaStats.processed;
      const totalSuccessful =
        topAnimeStats.successful + topMangaStats.successful;
      const totalFailed = topAnimeStats.failed + topMangaStats.failed;

      this.logger.log(
        `Jikan API series sync cronjob completed in ${duration}s. ` +
          `Total: ${totalProcessed} processed, ${totalSuccessful} successful, ${totalFailed} failed`,
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
   * Manual sync method for testing or on-demand updates
   * Can be called via API endpoint or worker job
   *
   * @param options - Sync options
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
      const topLimit = options?.topLimit || 100;

      // Sync existing series if requested (default: true)
      if (options?.syncExisting !== false) {
        this.logger.log('Syncing existing series with myAnimeListId');
        results.existing = await this.jikanCrawlService.syncExistingSeries();
        this.logger.log(
          `Existing series sync completed: ${JSON.stringify(results.existing)}`,
        );
      }

      // Sync top anime if requested (default: true)
      if (options?.syncTopAnime !== false) {
        this.logger.log(`Syncing top ${topLimit} anime`);
        results.topAnime = await this.jikanCrawlService.syncTopAnime(topLimit);
        this.logger.log(
          `Top anime sync completed: ${JSON.stringify(results.topAnime)}`,
        );
      }

      // Sync top manga if requested (default: true)
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
