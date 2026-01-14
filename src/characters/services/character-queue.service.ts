import { Injectable, Logger } from '@nestjs/common';
import { generateJobId } from 'src/common/utils';
import { JOB_NAME } from 'src/shared/constants';
import { RabbitMQService } from 'src/shared/services';
import { CharacterUpdateJob } from '../interfaces/character-queue.interface';

/**
 * Character Queue Service
 *
 * Service for sending character update jobs to RabbitMQ queue
 */
@Injectable()
export class CharacterQueueService {
  private readonly logger = new Logger(CharacterQueueService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  /**
   * Send character update job to RabbitMQ queue
   *
   * @param seriesId - Series ID in the database
   * @param myAnimeListId - MyAnimeList ID to fetch characters from Jikan API
   * @returns Promise with job ID
   */
  async sendCharacterUpdateJob(
    seriesId: string,
    myAnimeListId: string,
  ): Promise<string> {
    const jobId = generateJobId();
    const job: CharacterUpdateJob = {
      jobId,
      seriesId,
      myAnimeListId,
      timestamp: new Date().toISOString(),
    };

    this.logger.debug(
      `Sending character update job: ${jobId} for series ${seriesId} (MAL: ${myAnimeListId})`,
    );

    const success = await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.CHARACTER_UPDATE,
      job,
    );

    if (!success) {
      throw new Error(
        `Failed to send character update job: ${jobId} for series ${seriesId}`,
      );
    }

    this.logger.log(
      `Successfully sent character update job: ${jobId} for series ${seriesId}`,
    );

    return jobId;
  }
}
