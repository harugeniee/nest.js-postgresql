import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { CursorPaginationDto } from 'src/common/dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';
import { CreateSeriesDto, QuerySeriesDto, UpdateSeriesDto } from './dto';
import { SyncJikanDto } from './dto/sync-jikan.dto';
import { SeriesService } from './series.service';
import { AniListCrawlService } from './services/anilist-crawl.service';
import { JikanCrawlService } from './services/jikan-crawl.service';

@Controller('series')
export class SeriesController {
  constructor(
    private readonly seriesService: SeriesService,
    private readonly anilistCrawlService: AniListCrawlService,
    private readonly jikanCrawlService: JikanCrawlService,
  ) {}

  /**
   * Create a new series
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async create(@Body() createSeriesDto: CreateSeriesDto) {
    return this.seriesService.create(createSeriesDto);
  }

  /**
   * Get all series with offset pagination
   */
  @Get()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findAll(@Query() queryDto: QuerySeriesDto) {
    return this.seriesService.findAll(queryDto);
  }

  /**
   * Get all series with cursor pagination
   */
  @Get('cursor')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_LIST_CURSOR,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findAllCursor(@Query() paginationDto: CursorPaginationDto) {
    return this.seriesService.findAllCursor(paginationDto);
  }

  /**
   * Trigger crawl job for AniList media
   * Sends job to queue for asynchronous processing
   * Worker will crawl all pages and save media directly to database
   *
   * @param type - Media type to crawl (ANIME or MANGA), defaults to ANIME
   * @returns Job ID and status
   */
  @Get('anilist/crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCrawl(@Query('type') type?: 'ANIME' | 'MANGA') {
    // Validate and set default type
    const mediaType = type || 'ANIME';
    if (mediaType !== 'ANIME' && mediaType !== 'MANGA') {
      throw new BadRequestException(
        'Invalid type. Must be either ANIME or MANGA.',
      );
    }

    // Send crawl job to queue (will crawl all pages)
    const jobId = await this.anilistCrawlService.crawlAniListMedia(mediaType);

    return {
      success: true,
      jobId,
      type: mediaType,
      message: `Crawl job queued successfully. Worker will process all pages of ${mediaType} media.`,
    };
  }

  /**
   * Get media list from AniList API
   * Fetches paginated list of media (anime and manga) from AniList
   *
   * @param page - Page number (default: 1)
   * @param perPage - Items per page (default: 50, max: 50)
   * @returns AniList page data with media list
   */
  @Get('anilist')
  async getAniListMediaList(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    // Parse and validate page
    let pageNum = 1;
    if (page !== undefined) {
      pageNum = Number.parseInt(page, 10);
      if (Number.isNaN(pageNum) || pageNum < 1) {
        throw new BadRequestException(
          'Invalid page. Must be a positive number.',
        );
      }
    }

    // Parse and validate perPage
    let perPageNum = 50; // Default to max allowed
    if (perPage !== undefined) {
      perPageNum = Number.parseInt(perPage, 10);
      if (Number.isNaN(perPageNum) || perPageNum < 1 || perPageNum > 50) {
        throw new BadRequestException(
          'Invalid perPage. Must be between 1 and 50.',
        );
      }
    }

    return this.anilistCrawlService.getMediaListFromAniList(
      pageNum,
      perPageNum,
    );
  }

  /**
   * Get media detail from AniList by AniList ID
   * This endpoint fetches data directly from AniList API
   * Must be placed before @Get(':id') to avoid route conflict
   *
   * @param anilistId - AniList media ID (not our internal series ID)
   * @returns AniList media data
   */
  @Get('anilist/:anilistId')
  async getAniListMediaById(@Param('anilistId') anilistId: string) {
    const id = Number.parseInt(anilistId, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException('Invalid AniList ID. Must be a number.');
    }
    return this.anilistCrawlService.getMediaById(id);
  }

  @Get('anilist/:anilistId/save')
  async saveAniListMediaById(@Param('anilistId') anilistId: string) {
    const id = Number.parseInt(anilistId, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException('Invalid AniList ID. Must be a number.');
    }
    return this.anilistCrawlService.fetchAndSaveMediaById(id);
  }

  /**
   * Sync series from Jikan API by MyAnimeList ID
   * Accepts MAL ID in request body with optional type
   *
   * @param syncDto - DTO containing myAnimeListId and optional type
   * @returns Synced series entity
   */
  @Post('jikan/sync')
  @HttpCode(HttpStatus.OK)
  async syncJikanSeries(@Body() syncDto: SyncJikanDto) {
    const { myAnimeListId, type } = syncDto;

    // If type is provided, use it; otherwise try both
    if (type === 'anime') {
      const result = await this.jikanCrawlService.syncAnimeById(myAnimeListId);
      if (!result) {
        throw new BadRequestException(
          `Failed to sync anime with MAL ID ${myAnimeListId}. It may not exist in Jikan API.`,
        );
      }
      return {
        success: true,
        series: result,
        message: `Successfully synced anime with MAL ID ${myAnimeListId}`,
      };
    } else if (type === 'manga') {
      const result = await this.jikanCrawlService.syncMangaById(myAnimeListId);
      if (!result) {
        throw new BadRequestException(
          `Failed to sync manga with MAL ID ${myAnimeListId}. It may not exist in Jikan API.`,
        );
      }
      return {
        success: true,
        series: result,
        message: `Successfully synced manga with MAL ID ${myAnimeListId}`,
      };
    } else {
      // Try anime first, then manga if anime fails
      let result = await this.jikanCrawlService.syncAnimeById(myAnimeListId);
      if (result) {
        return {
          success: true,
          series: result,
          type: 'anime',
          message: `Successfully synced anime with MAL ID ${myAnimeListId}`,
        };
      }

      // Try manga if anime failed
      result = await this.jikanCrawlService.syncMangaById(myAnimeListId);
      if (result) {
        return {
          success: true,
          series: result,
          type: 'manga',
          message: `Successfully synced manga with MAL ID ${myAnimeListId}`,
        };
      }

      throw new BadRequestException(
        `Failed to sync series with MAL ID ${myAnimeListId}. It may not exist in Jikan API.`,
      );
    }
  }

  /**
   * Sync series from Jikan API by MyAnimeList ID (GET endpoint)
   * Must be placed before @Get(':id') to avoid route conflict
   *
   * @param malId - MyAnimeList ID (MAL ID)
   * @param type - Optional type (anime or manga). If not provided, will try both
   * @returns Synced series entity
   */
  @Get('jikan/:malId/sync')
  @HttpCode(HttpStatus.OK)
  async syncJikanSeriesById(
    @Param('malId') malId: string,
    @Query('type') type?: 'anime' | 'manga',
  ) {
    const id = Number.parseInt(malId, 10);
    if (Number.isNaN(id) || id < 1) {
      throw new BadRequestException(
        'Invalid MyAnimeList ID. Must be a positive number.',
      );
    }

    // If type is provided, use it; otherwise try both
    if (type === 'anime') {
      const result = await this.jikanCrawlService.syncAnimeById(id);
      if (!result) {
        throw new BadRequestException(
          `Failed to sync anime with MAL ID ${id}. It may not exist in Jikan API.`,
        );
      }
      return {
        success: true,
        series: result,
        message: `Successfully synced anime with MAL ID ${id}`,
      };
    } else if (type === 'manga') {
      const result = await this.jikanCrawlService.syncMangaById(id);
      if (!result) {
        throw new BadRequestException(
          `Failed to sync manga with MAL ID ${id}. It may not exist in Jikan API.`,
        );
      }
      return {
        success: true,
        series: result,
        message: `Successfully synced manga with MAL ID ${id}`,
      };
    } else {
      // Try anime first, then manga if anime fails
      let result = await this.jikanCrawlService.syncAnimeById(id);
      if (result) {
        return {
          success: true,
          series: result,
          type: 'anime',
          message: `Successfully synced anime with MAL ID ${id}`,
        };
      }

      // Try manga if anime failed
      result = await this.jikanCrawlService.syncMangaById(id);
      if (result) {
        return {
          success: true,
          series: result,
          type: 'manga',
          message: `Successfully synced manga with MAL ID ${id}`,
        };
      }

      throw new BadRequestException(
        `Failed to sync series with MAL ID ${id}. It may not exist in Jikan API.`,
      );
    }
  }

  /**
   * Get a series by ID
   */
  @Get(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.seriesService.findById(id, {
      relations: {
        genres: {
          genre: true,
        },
      },
    });
  }

  /**
   * Update a series
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateSeriesDto: UpdateSeriesDto,
  ) {
    return this.seriesService.update(id, updateSeriesDto);
  }

  /**
   * Delete a series (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.SERIES_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.SERIES,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.seriesService.softDelete(id);
  }

  /**
   * Get a series by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.seriesService.findByIdWithReactions(id, kindsArray);
  }
}
