import { Injectable, Logger } from '@nestjs/common';
import { SERIES_CONSTANTS } from 'src/shared/constants';
import { Series, SeriesTitle } from '../entities/series.entity';
import {
  JikanAnimeData,
  JikanAired,
  JikanMangaData,
  JikanExternal,
  JikanStreaming,
  JikanTrailer,
} from './jikan.types';

/**
 * Jikan Mapper Service
 *
 * Maps Jikan API responses to Series entity structure
 * Handles field transformations, status/format mappings, and data normalization
 */
@Injectable()
export class JikanMapperService {
  private readonly logger = new Logger(JikanMapperService.name);

  /**
   * Map Jikan anime data to Series entity
   *
   * @param jikanData - Jikan anime data
   * @returns Partial Series entity data
   */
  mapAnimeToSeries(jikanData: JikanAnimeData): Partial<Series> {
    const seriesData: Partial<Series> = {
      myAnimeListId: jikanData.mal_id.toString(),
      title: this.mapTitle(jikanData),
      type: SERIES_CONSTANTS.TYPE.ANIME,
      format: this.mapAnimeFormat(jikanData.type),
      status: this.mapAnimeStatus(jikanData.status),
      description: jikanData.synopsis || undefined,
      startDate: this.parseDate(jikanData.aired?.from),
      endDate: this.parseDate(jikanData.aired?.to),
      season: this.mapSeason(jikanData.season),
      seasonYear: jikanData.year || undefined,
      episodes: jikanData.episodes || undefined,
      duration: this.parseDuration(jikanData.duration),
      averageScore: jikanData.score || undefined,
      popularity: jikanData.popularity || 0,
      favoriteCount: jikanData.favorites || 0,
      isNsfw: this.isNsfw(jikanData.rating),
      synonyms: jikanData.title_synonyms || undefined,
      externalLinks: this.mapExternalLinks(jikanData.external),
      streamingEpisodes: this.mapStreamingLinks(jikanData.streaming),
      trailer: this.mapTrailer(jikanData.trailer),
      coverImageUrls: this.mapCoverImages(jikanData.images),
      bannerImageUrl: jikanData.images?.jpg?.large_image_url || undefined,
      source: this.mapSource(jikanData.source),
      metadata: {
        scored_by: jikanData.scored_by,
        rank: jikanData.rank,
        members: jikanData.members,
        background: jikanData.background,
        broadcast: jikanData.broadcast,
        producers: jikanData.producers?.map((p) => ({
          mal_id: p.mal_id,
          name: p.name,
          url: p.url,
        })),
        licensors: jikanData.licensors?.map((l) => ({
          mal_id: l.mal_id,
          name: l.name,
          url: l.url,
        })),
        theme: jikanData.theme,
        relations: jikanData.relations,
        url: jikanData.url,
        approved: jikanData.approved,
        airing: jikanData.airing,
      },
    };

    return seriesData;
  }

  /**
   * Map Jikan manga data to Series entity
   *
   * @param jikanData - Jikan manga data
   * @returns Partial Series entity data
   */
  mapMangaToSeries(jikanData: JikanMangaData): Partial<Series> {
    const seriesData: Partial<Series> = {
      myAnimeListId: jikanData.mal_id.toString(),
      title: this.mapTitle(jikanData),
      type: SERIES_CONSTANTS.TYPE.MANGA,
      format: this.mapMangaFormat(jikanData.type),
      status: this.mapMangaStatus(jikanData.status),
      description: jikanData.synopsis || undefined,
      startDate: this.parseDate(jikanData.published?.from),
      endDate: this.parseDate(jikanData.published?.to),
      chapters: jikanData.chapters || undefined,
      volumes: jikanData.volumes || undefined,
      averageScore: jikanData.score || undefined,
      popularity: jikanData.popularity || 0,
      favoriteCount: jikanData.favorites || 0,
      synonyms: jikanData.title_synonyms || undefined,
      externalLinks: this.mapExternalLinks(jikanData.external),
      coverImageUrls: this.mapCoverImages(jikanData.images),
      bannerImageUrl: jikanData.images?.jpg?.large_image_url || undefined,
      metadata: {
        scored_by: jikanData.scored_by,
        rank: jikanData.rank,
        members: jikanData.members,
        background: jikanData.background,
        authors: jikanData.authors?.map((a) => ({
          mal_id: a.mal_id,
          name: a.name,
          url: a.url,
        })),
        serializations: jikanData.serializations?.map((s) => ({
          mal_id: s.mal_id,
          name: s.name,
          url: s.url,
        })),
        relations: jikanData.relations,
        url: jikanData.url,
        approved: jikanData.approved,
        publishing: jikanData.publishing,
      },
    };

    return seriesData;
  }

  /**
   * Map Jikan title data to SeriesTitle
   */
  private mapTitle(
    jikanData: JikanAnimeData | JikanMangaData,
  ): SeriesTitle | undefined {
    if (
      !jikanData.title &&
      !jikanData.title_english &&
      !jikanData.title_japanese
    ) {
      return undefined;
    }

    return {
      romaji: jikanData.title || undefined,
      english: jikanData.title_english || undefined,
      native: jikanData.title_japanese || undefined,
      userPreferred: jikanData.title || undefined,
    };
  }

  /**
   * Map Jikan anime format to Series format
   */
  private mapAnimeFormat(jikanType?: string): string | undefined {
    if (!jikanType) return undefined;

    const formatMap: Record<string, string> = {
      TV: SERIES_CONSTANTS.FORMAT.TV,
      Movie: SERIES_CONSTANTS.FORMAT.MOVIE,
      OVA: SERIES_CONSTANTS.FORMAT.OVA,
      ONA: SERIES_CONSTANTS.FORMAT.ONA,
      Special: SERIES_CONSTANTS.FORMAT.SPECIAL,
      Music: SERIES_CONSTANTS.FORMAT.MUSIC,
      'TV Short': SERIES_CONSTANTS.FORMAT.TV_SHORT,
    };

    return formatMap[jikanType] || undefined;
  }

  /**
   * Map Jikan manga format to Series format
   */
  private mapMangaFormat(jikanType?: string): string | undefined {
    if (!jikanType) return undefined;

    const formatMap: Record<string, string> = {
      Manga: SERIES_CONSTANTS.FORMAT.MANGA,
      Novel: SERIES_CONSTANTS.FORMAT.NOVEL,
      'Light Novel': SERIES_CONSTANTS.FORMAT.NOVEL,
      'One-shot': SERIES_CONSTANTS.FORMAT.ONE_SHOT,
    };

    return formatMap[jikanType] || undefined;
  }

  /**
   * Map Jikan anime status to Series releasing status
   */
  private mapAnimeStatus(jikanStatus?: string): string | undefined {
    if (!jikanStatus) return undefined;

    const statusMap: Record<string, string> = {
      'Finished Airing': SERIES_CONSTANTS.RELEASING_STATUS.FINISHED,
      'Currently Airing': SERIES_CONSTANTS.RELEASING_STATUS.RELEASING,
      'Not yet aired': SERIES_CONSTANTS.RELEASING_STATUS.NOT_YET_RELEASED,
      Cancelled: SERIES_CONSTANTS.RELEASING_STATUS.CANCELLED,
      'On Hiatus': SERIES_CONSTANTS.RELEASING_STATUS.HIATUS,
    };

    return statusMap[jikanStatus] || undefined;
  }

  /**
   * Map Jikan manga status to Series releasing status
   */
  private mapMangaStatus(jikanStatus?: string): string | undefined {
    if (!jikanStatus) return undefined;

    const statusMap: Record<string, string> = {
      Finished: SERIES_CONSTANTS.RELEASING_STATUS.FINISHED,
      Publishing: SERIES_CONSTANTS.RELEASING_STATUS.RELEASING,
      'On Hiatus': SERIES_CONSTANTS.RELEASING_STATUS.HIATUS,
      Discontinued: SERIES_CONSTANTS.RELEASING_STATUS.CANCELLED,
      'Not yet published': SERIES_CONSTANTS.RELEASING_STATUS.NOT_YET_RELEASED,
    };

    return statusMap[jikanStatus] || undefined;
  }

  /**
   * Map Jikan season to Series season
   */
  private mapSeason(jikanSeason?: string): string | undefined {
    if (!jikanSeason) return undefined;

    const seasonMap: Record<string, string> = {
      winter: SERIES_CONSTANTS.SEASON.WINTER,
      spring: SERIES_CONSTANTS.SEASON.SPRING,
      summer: SERIES_CONSTANTS.SEASON.SUMMER,
      fall: SERIES_CONSTANTS.SEASON.FALL,
    };

    return seasonMap[jikanSeason.toLowerCase()] || undefined;
  }

  /**
   * Map Jikan source to Series source
   */
  private mapSource(jikanSource?: string): string | undefined {
    if (!jikanSource) return undefined;

    // Jikan source is usually a simple string like "Manga", "Original", etc.
    const sourceMap: Record<string, string> = {
      Original: SERIES_CONSTANTS.SOURCE.ORIGINAL,
      Manga: SERIES_CONSTANTS.SOURCE.MANGA,
      'Light novel': SERIES_CONSTANTS.SOURCE.LIGHT_NOVEL,
      'Visual novel': SERIES_CONSTANTS.SOURCE.VISUAL_NOVEL,
      'Video game': SERIES_CONSTANTS.SOURCE.VIDEO_GAME,
      Other: SERIES_CONSTANTS.SOURCE.OTHER,
      Novel: SERIES_CONSTANTS.SOURCE.NOVEL,
      Doujinshi: SERIES_CONSTANTS.SOURCE.DOUJINSHI,
      Anime: SERIES_CONSTANTS.SOURCE.ANIME,
      'Web novel': SERIES_CONSTANTS.SOURCE.WEB_NOVEL,
      'Live action': SERIES_CONSTANTS.SOURCE.LIVE_ACTION,
      Game: SERIES_CONSTANTS.SOURCE.GAME,
      Comic: SERIES_CONSTANTS.SOURCE.COMIC,
    };

    return sourceMap[jikanSource] || SERIES_CONSTANTS.SOURCE.OTHER;
  }

  /**
   * Parse Jikan date string to Date object
   * Jikan dates are in ISO8601 format (YYYY-MM-DD)
   */
  private parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // Jikan dates are in format YYYY-MM-DD or YYYY-MM or YYYY
      const parts = dateString.split('-');
      if (parts.length >= 1 && parts[0]) {
        const year = parseInt(parts[0], 10);
        const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0; // JavaScript months are 0-indexed
        const day = parts[2] ? parseInt(parts[2], 10) : 1;

        if (!isNaN(year)) {
          return new Date(Date.UTC(year, month, day));
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse date: ${dateString}`, error);
    }

    return undefined;
  }

  /**
   * Parse duration string to minutes
   * Jikan duration format: "X min per ep" or "X min"
   */
  private parseDuration(durationString?: string): number | undefined {
    if (!durationString) return undefined;

    try {
      // Extract number from string like "24 min per ep" or "24 min"
      const match = durationString.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse duration: ${durationString}`, error);
    }

    return undefined;
  }

  /**
   * Check if content is NSFW based on rating
   */
  private isNsfw(rating?: string): boolean {
    if (!rating) return false;

    const nsfwRatings = [
      'R - 17+ (violence & profanity)',
      'R+ - Mild Nudity',
      'Rx - Hentai',
    ];
    return nsfwRatings.includes(rating);
  }

  /**
   * Map external links array to object
   */
  private mapExternalLinks(
    externalLinks?: JikanExternal[],
  ): Record<string, string> | undefined {
    if (!externalLinks || externalLinks.length === 0) {
      return undefined;
    }

    const links: Record<string, string> = {};
    for (const link of externalLinks) {
      if (link.name && link.url) {
        links[link.name] = link.url;
      }
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  /**
   * Map streaming links array to object
   */
  private mapStreamingLinks(
    streamingLinks?: JikanStreaming[],
  ): Record<string, string> | undefined {
    if (!streamingLinks || streamingLinks.length === 0) {
      return undefined;
    }

    const links: Record<string, string> = {};
    for (const link of streamingLinks) {
      if (link.name && link.url) {
        links[link.name] = link.url;
      }
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  /**
   * Map trailer data to JSONB object
   */
  private mapTrailer(
    trailer?: JikanTrailer,
  ): Record<string, string> | undefined {
    if (!trailer) return undefined;

    const trailerData: Record<string, string> = {};
    if (trailer.youtube_id) trailerData.youtube_id = trailer.youtube_id;
    if (trailer.url) trailerData.url = trailer.url;
    if (trailer.embed_url) trailerData.embed_url = trailer.embed_url;

    return Object.keys(trailerData).length > 0 ? trailerData : undefined;
  }

  /**
   * Map cover images to object
   */
  private mapCoverImages(images?: {
    jpg?: {
      image_url?: string;
      small_image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      image_url?: string;
      small_image_url?: string;
      large_image_url?: string;
    };
  }): Record<string, string> | undefined {
    if (!images) return undefined;

    const coverImages: Record<string, string> = {};

    if (images.jpg?.image_url) coverImages.jpg = images.jpg.image_url;
    if (images.jpg?.small_image_url)
      coverImages.jpg_small = images.jpg.small_image_url;
    if (images.jpg?.large_image_url)
      coverImages.jpg_large = images.jpg.large_image_url;
    if (images.webp?.image_url) coverImages.webp = images.webp.image_url;
    if (images.webp?.small_image_url)
      coverImages.webp_small = images.webp.small_image_url;
    if (images.webp?.large_image_url)
      coverImages.webp_large = images.webp.large_image_url;

    return Object.keys(coverImages).length > 0 ? coverImages : undefined;
  }
}
