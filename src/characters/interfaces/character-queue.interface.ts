/**
 * Character Queue Job Interface
 *
 * Interface for character update jobs sent to RabbitMQ queue
 * Worker will fetch character data from Jikan API using the myAnimeListId
 */

export interface CharacterUpdateJob {
  /**
   * Unique job identifier
   */
  jobId: string;

  /**
   * Series ID in the database
   */
  seriesId: string;

  /**
   * MyAnimeList ID to fetch characters from Jikan API
   */
  myAnimeListId: string;

  /**
   * Timestamp when the job was created
   */
  timestamp: string;
}

/**
 * Character Update Job Result
 *
 * Result returned after processing character update job
 */
export interface CharacterUpdateJobResult {
  /**
   * Job identifier
   */
  jobId: string;

  /**
   * Whether the job was processed successfully
   */
  success: boolean;

  /**
   * Error message if job failed
   */
  error?: string;

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Additional result data
   */
  data?: {
    seriesId?: string;
    myAnimeListId?: string;
    charactersProcessed?: number;
    charactersCreated?: number;
    charactersUpdated?: number;
  };
}
