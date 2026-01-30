import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CacheService } from 'src/shared/services';
import {
  JikanAnimeData,
  JikanAnimeFullResponse,
  JikanAnimeResponse,
  JikanMangaData,
  JikanMangaFullResponse,
  JikanMangaResponse,
  JikanSearchParams,
  JikanSearchResponse,
  JikanTopAnimeResponse,
  JikanTopMangaResponse,
} from './jikan.types';

/**
 * Jikan API Service for Series
 *
 * Service for fetching anime and manga data from Jikan API
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

  /** Redis key set when Jikan API returns 429; cron checks this before sending jobs. TTL 120s. */
  private static readonly JIKAN_RATE_LIMIT_BLOCKED_UNTIL_KEY =
    'jikan:rate_limit:blocked_until';

  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get anime by MyAnimeList ID
   *
   * @param malId - MyAnimeList anime ID
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with anime data
   */
  async getAnimeById(
    malId: number,
    retryCount: number = 0,
  ): Promise<JikanAnimeData> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/anime/${malId}`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(`Fetching anime ${malId} from Jikan API`);

      const response = await firstValueFrom(
        this.httpService.get<JikanAnimeResponse>(url, {
          timeout: 10000, // 10 second timeout
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(`Successfully fetched anime ${malId}`);

      return response.data.data;
    } catch (error: unknown) {
      return this.handleError(error, 'anime', malId, retryCount, maxRetries);
    }
  }

  /**
   * Get full anime data by MyAnimeList ID
   *
   * @param malId - MyAnimeList anime ID
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with full anime data
   */
  async getAnimeFullById(
    malId: number,
    retryCount: number = 0,
  ): Promise<JikanAnimeData> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/anime/${malId}/full`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(`Fetching full anime data ${malId} from Jikan API`);

      const response = await firstValueFrom(
        this.httpService.get<JikanAnimeFullResponse>(url, {
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(`Successfully fetched full anime data ${malId}`);

      return response.data.data;
    } catch (error: unknown) {
      return this.handleError(error, 'anime', malId, retryCount, maxRetries);
    }
  }

  /**
   * Get manga by MyAnimeList ID
   *
   * @param malId - MyAnimeList manga ID
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with manga data
   */
  async getMangaById(
    malId: number,
    retryCount: number = 0,
  ): Promise<JikanMangaData> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/manga/${malId}`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(`Fetching manga ${malId} from Jikan API`);

      const response = await firstValueFrom(
        this.httpService.get<JikanMangaResponse>(url, {
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(`Successfully fetched manga ${malId}`);

      return response.data.data;
    } catch (error: unknown) {
      return this.handleError(error, 'manga', malId, retryCount, maxRetries);
    }
  }

  /**
   * Get full manga data by MyAnimeList ID
   *
   * @param malId - MyAnimeList manga ID
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with full manga data
   */
  async getMangaFullById(
    malId: number,
    retryCount: number = 0,
  ): Promise<JikanMangaData> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/manga/${malId}/full`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(`Fetching full manga data ${malId} from Jikan API`);

      const response = await firstValueFrom(
        this.httpService.get<JikanMangaFullResponse>(url, {
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(`Successfully fetched full manga data ${malId}`);

      return response.data.data;
    } catch (error: unknown) {
      return this.handleError(error, 'manga', malId, retryCount, maxRetries);
    }
  }

  /**
   * Search anime
   *
   * @param params - Search parameters
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with search results
   */
  async searchAnime(
    params: JikanSearchParams = {},
    retryCount: number = 0,
  ): Promise<JikanSearchResponse<JikanAnimeData>> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/anime`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(
        `Searching anime with params: ${JSON.stringify(params)}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<JikanSearchResponse<JikanAnimeData>>(url, {
          params,
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(
        `Successfully fetched ${response.data.data.length} anime results`,
      );

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (statusCode === 429) {
        await this.setRateLimitBlockedUntil();
        this.logger.warn(
          `Rate limit exceeded for anime search, set jikan:rate_limit:blocked_until, waiting before retry`,
        );
        await this.delay(2000);

        if (retryCount < maxRetries) {
          return this.searchAnime(params, retryCount + 1);
        }
        throw new Error('Rate limit exceeded after retries');
      }

      if (retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        this.logger.warn(
          `Error searching anime (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms`,
        );
        await this.delay(delayMs);
        return this.searchAnime(params, retryCount + 1);
      }

      this.logger.error(
        `Failed to search anime after ${maxRetries} retries: ${errorMessage}`,
      );
      throw new Error(`Failed to search anime from Jikan API: ${errorMessage}`);
    }
  }

  /**
   * Search manga
   *
   * @param params - Search parameters
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with search results
   */
  async searchManga(
    params: JikanSearchParams = {},
    retryCount: number = 0,
  ): Promise<JikanSearchResponse<JikanMangaData>> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/manga`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(
        `Searching manga with params: ${JSON.stringify(params)}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<JikanSearchResponse<JikanMangaData>>(url, {
          params,
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(
        `Successfully fetched ${response.data.data.length} manga results`,
      );

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const statusCode =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (statusCode === 429) {
        await this.setRateLimitBlockedUntil();
        this.logger.warn(
          `Rate limit exceeded for manga search, set jikan:rate_limit:blocked_until, waiting before retry`,
        );
        await this.delay(2000);

        if (retryCount < maxRetries) {
          return this.searchManga(params, retryCount + 1);
        }
        throw new Error('Rate limit exceeded after retries');
      }

      if (retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        this.logger.warn(
          `Error searching manga (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms`,
        );
        await this.delay(delayMs);
        return this.searchManga(params, retryCount + 1);
      }

      this.logger.error(
        `Failed to search manga after ${maxRetries} retries: ${errorMessage}`,
      );
      throw new Error(`Failed to search manga from Jikan API: ${errorMessage}`);
    }
  }

  /**
   * Get top anime
   *
   * @param params - Query parameters (page, limit, filter, etc.)
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with top anime results
   */
  async getTopAnime(
    params: {
      page?: number;
      limit?: number;
      type?: string;
      filter?: string;
      rating?: string;
      sfw?: boolean;
    } = {},
    retryCount: number = 0,
  ): Promise<JikanTopAnimeResponse> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/top/anime`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(
        `Fetching top anime with params: ${JSON.stringify(params)}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<JikanTopAnimeResponse>(url, {
          params,
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(
        `Successfully fetched ${response.data.data.length} top anime`,
      );

      return response.data;
    } catch (error: unknown) {
      return this.handleError(
        error,
        'top anime',
        0,
        retryCount,
        maxRetries,
        async () => this.getTopAnime(params, retryCount + 1),
      );
    }
  }

  /**
   * Get top manga
   *
   * @param params - Query parameters (page, limit, filter, etc.)
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with top manga results
   */
  async getTopManga(
    params: {
      page?: number;
      limit?: number;
      type?: string;
      filter?: string;
    } = {},
    retryCount: number = 0,
  ): Promise<JikanTopMangaResponse> {
    const maxRetries = 3;
    const url = `${this.BASE_URL}/top/manga`;

    try {
      await this.enforceRateLimit();

      this.logger.debug(
        `Fetching top manga with params: ${JSON.stringify(params)}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<JikanTopMangaResponse>(url, {
          params,
          timeout: 10000,
        }),
      );

      this.updateRateLimitTracking();

      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Jikan API');
      }

      this.logger.debug(
        `Successfully fetched ${response.data.data.length} top manga`,
      );

      return response.data;
    } catch (error: unknown) {
      return this.handleError(
        error,
        'top manga',
        0,
        retryCount,
        maxRetries,
        async () => this.getTopManga(params, retryCount + 1),
      );
    }
  }

  /**
   * Handle errors with retry logic
   */
  private async handleError<T>(
    error: unknown,
    type: string,
    id: number | string,
    retryCount: number,
    maxRetries: number,
    retryFn?: () => Promise<T>,
  ): Promise<T> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const statusCode =
      error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    // Handle 404 - not found
    if (statusCode === 404) {
      this.logger.warn(`${type} ${id} not found (404)`);
      throw new Error(`${type} ${id} not found`);
    }

    // Handle rate limiting (429): set Redis so cron skips next run; then wait and retry
    if (statusCode === 429) {
      await this.setRateLimitBlockedUntil();
      this.logger.warn(
        `Rate limit exceeded for ${type} ${id}, set jikan:rate_limit:blocked_until, waiting before retry`,
      );
      await this.delay(2000);

      if (retryCount < maxRetries && retryFn) {
        return retryFn();
      }
      throw new Error('Rate limit exceeded after retries');
    }

    // Retry logic for network errors
    if (retryCount < maxRetries && retryFn) {
      const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
      this.logger.warn(
        `Error fetching ${type} ${id} (attempt ${retryCount + 1}/${maxRetries}): ${errorMessage}. Retrying in ${delayMs}ms`,
      );
      await this.delay(delayMs);
      return retryFn();
    }

    this.logger.error(
      `Failed to fetch ${type} ${id} after ${maxRetries} retries: ${errorMessage}`,
    );
    throw new Error(`Failed to fetch ${type} from Jikan API: ${errorMessage}`);
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

  /**
   * Set Redis key jikan:rate_limit:blocked_until when Jikan API returns 429.
   * Cron checks this key before sending jobs; worker can skip or delay.
   */
  private async setRateLimitBlockedUntil(): Promise<void> {
    const blockedUntilMs = Date.now() + 60_000;
    const ttlSec = 120;
    await this.cacheService.set(
      JikanApiService.JIKAN_RATE_LIMIT_BLOCKED_UNTIL_KEY,
      String(blockedUntilMs),
      ttlSec,
    );
  }
}
