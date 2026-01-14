import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { JikanCharacterResponse, JikanCharacterEntry } from './jikan.types';

/**
 * Jikan API Service
 *
 * Service for fetching character data from Jikan API
 * Handles rate limiting, error handling, and retry logic
 *
 * Rate limits: 3 requests/second, 60 requests/minute
 */
@Injectable()
export class JikanApiService {
  private readonly logger = new Logger(JikanApiService.name);
  private readonly BASE_URL = 'https://api.jikan.moe/v4';
  private readonly RATE_LIMIT_PER_SECOND = 3;
  private readonly RATE_LIMIT_PER_MINUTE = 60;
  private readonly REQUEST_DELAY_MS = 350; // ~3 requests per second

  // Rate limiting tracking
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private minuteStartTime: number = Date.now();

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get manga characters from Jikan API
   *
   * @param malId - MyAnimeList manga ID
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with character data
   */
  async getMangaCharacters(
    malId: string,
    retryCount: number = 0,
  ): Promise<JikanCharacterResponse> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/manga/${malId}/characters`;

    try {
      // Rate limiting: ensure we don't exceed 3 requests/second
      await this.enforceRateLimit();

      this.logger.debug(
        `Fetching characters for manga ${malId} from Jikan API`,
      );

      const response = await firstValueFrom(
        this.httpService.get<JikanCharacterResponse>(url, {
          timeout: 10000, // 10 second timeout
        }),
      );

      // Update rate limit tracking
      this.updateRateLimitTracking();

      // Validate response
      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(
        `Successfully fetched ${response.data.data.length} characters for manga ${malId}`,
      );

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      // Handle 404 - manga not found or no characters
      if (statusCode === 404) {
        this.logger.warn(`Manga ${malId} not found or has no characters (404)`);
        return { data: [] };
      }

      // Handle rate limiting (429)
      if (statusCode === 429) {
        this.logger.warn(
          `Rate limit exceeded for manga ${malId}, waiting before retry`,
        );
        // Wait longer before retry
        await this.delay(2000);

        if (retryCount < maxRetries) {
          return this.getMangaCharacters(malId, retryCount + 1);
        }
        throw new Error('Rate limit exceeded after retries');
      }

      // Retry logic for network errors
      if (retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
        this.logger.warn(
          `Error fetching characters for manga ${malId} (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms`,
        );
        await this.delay(delayMs);
        return this.getMangaCharacters(malId, retryCount + 1);
      }

      this.logger.error(
        `Failed to fetch characters for manga ${malId} after ${maxRetries} retries: ${errorMessage}`,
      );
      throw new Error(
        `Failed to fetch characters from Jikan API: ${errorMessage}`,
      );
    }
  }

  /**
   * Enforce rate limiting
   * Ensures we don't exceed 3 requests/second and 60 requests/minute
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset minute counter if a minute has passed
    if (now - this.minuteStartTime >= 60000) {
      this.requestCount = 0;
      this.minuteStartTime = now;
    }

    // Check per-minute limit
    if (this.requestCount >= this.RATE_LIMIT_PER_MINUTE) {
      const waitTime = 60000 - (now - this.minuteStartTime);
      this.logger.warn(`Rate limit per minute reached, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      this.requestCount = 0;
      this.minuteStartTime = Date.now();
    }

    // Check per-second limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.REQUEST_DELAY_MS) {
      const waitTime = this.REQUEST_DELAY_MS - timeSinceLastRequest;
      await this.delay(waitTime);
    }
  }

  /**
   * Update rate limit tracking after successful request
   */
  private updateRateLimitTracking(): void {
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
