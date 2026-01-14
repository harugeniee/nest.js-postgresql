import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Series } from 'src/series/entities/series.entity';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { IsNull, Not, Repository } from 'typeorm';
import { CharacterQueueService } from './character-queue.service';

/**
 * Character Update Cronjob Service
 *
 * Service for scheduling character updates from Jikan API
 * Runs hourly to fetch manga series and queue character update jobs
 */
@Injectable()
export class CharacterUpdateCronjobService {
  private readonly logger = new Logger(CharacterUpdateCronjobService.name);
  private readonly BATCH_SIZE = 100; // Process series in batches

  constructor(
    @InjectRepository(Series)
    private readonly seriesRepository: Repository<Series>,
    private readonly characterQueueService: CharacterQueueService,
  ) {}

  /**
   * Cron job to update characters from Jikan API
   * Runs every hour to check for manga series and queue character update jobs
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async updateCharactersFromJikan(): Promise<void> {
    this.logger.log('Starting character update cronjob');

    try {
      // Query all manga series with myAnimeListId
      const mangaSeries = await this.getMangaSeriesWithMalId();

      if (mangaSeries.length === 0) {
        this.logger.log('No manga series with MyAnimeList ID found');
        return;
      }

      this.logger.log(
        `Found ${mangaSeries.length} manga series with MyAnimeList ID`,
      );

      // Process in batches to avoid overwhelming the queue
      let processed = 0;
      let queued = 0;
      let errors = 0;

      for (let i = 0; i < mangaSeries.length; i += this.BATCH_SIZE) {
        const batch = mangaSeries.slice(i, i + this.BATCH_SIZE);

        for (const series of batch) {
          try {
            if (!series.myAnimeListId) {
              this.logger.warn(
                `Series ${series.id} has no myAnimeListId, skipping`,
              );
              continue;
            }

            await this.characterQueueService.sendCharacterUpdateJob(
              series.id,
              series.myAnimeListId,
            );

            queued++;
            processed++;
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Failed to queue character update job for series ${series.id}: ${errorMessage}`,
            );
            errors++;
            processed++;
          }
        }

        // Log progress for large batches
        if (mangaSeries.length > this.BATCH_SIZE) {
          this.logger.log(
            `Processed ${processed}/${mangaSeries.length} series (${queued} queued, ${errors} errors)`,
          );
        }
      }

      this.logger.log(
        `Character update cronjob completed: ${processed} processed, ${queued} queued, ${errors} errors`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error in character update cronjob: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Get all manga series with MyAnimeList ID
   *
   * @returns Array of Series entities
   */
  private async getMangaSeriesWithMalId(): Promise<Series[]> {
    return this.seriesRepository.find({
      where: {
        type: SERIES_CONSTANTS.TYPE.MANGA,
        myAnimeListId: Not(IsNull()),
      },
      select: ['id', 'myAnimeListId', 'type'],
    });
  }
}
