/**
 * Jikan API Types for Series
 *
 * TypeScript interfaces for Jikan API v4 responses
 * Based on Jikan API v4 documentation: https://docs.api.jikan.moe/
 */

/**
 * Jikan Images
 * Contains image URLs in different formats
 */
export interface JikanImages {
  jpg: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
  webp: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
}

/**
 * Jikan Trailer
 * Trailer information for anime
 */
export interface JikanTrailer {
  youtube_id?: string;
  url?: string;
  embed_url?: string;
  images?: {
    image_url?: string;
    small_image_url?: string;
    medium_image_url?: string;
    large_image_url?: string;
    maximum_image_url?: string;
  };
}

/**
 * Jikan Title
 * Title information with type
 */
export interface JikanTitle {
  type: string;
  title: string;
}

/**
 * Jikan Aired/Published Date
 * Date information with fuzzy date support
 */
export interface JikanAired {
  from?: string;
  to?: string;
  prop?: {
    from?: {
      day?: number;
      month?: number;
      year?: number;
    };
    to?: {
      day?: number;
      month?: number;
      year?: number;
    };
    string?: string;
  };
}

/**
 * Jikan Broadcast
 * Broadcast information for anime
 */
export interface JikanBroadcast {
  day?: string;
  time?: string;
  timezone?: string;
  string?: string;
}

/**
 * Jikan Entity (Genre, Studio, Producer, etc.)
 * Generic entity structure used by genres, studios, producers
 */
export interface JikanEntity {
  mal_id: number;
  type?: string;
  name: string;
  url?: string;
}

/**
 * Jikan External Link
 * External link to another site
 */
export interface JikanExternal {
  name: string;
  url: string;
}

/**
 * Jikan Streaming Link
 * Streaming service link
 */
export interface JikanStreaming {
  name: string;
  url: string;
}

/**
 * Jikan Relation Entry
 * Related series entry
 */
export interface JikanRelationEntry {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

/**
 * Jikan Relation
 * Related series information
 */
export interface JikanRelation {
  relation: string;
  entry: JikanRelationEntry[];
}

/**
 * Jikan Anime Data
 * Complete anime data structure from Jikan API
 */
export interface JikanAnimeData {
  mal_id: number;
  url: string;
  images: JikanImages;
  trailer?: JikanTrailer;
  approved: boolean;
  titles: JikanTitle[];
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  type?: string; // TV, Movie, OVA, ONA, Special, Music, CM, PV, TV Special
  source?: string;
  episodes?: number;
  status?: string; // Finished Airing, Currently Airing, Not yet aired, Cancelled, On Hiatus
  airing: boolean;
  aired: JikanAired;
  duration?: string;
  rating?: string; // G - All Ages, PG - Children, PG-13 - Teens 13 or older, R - 17+ (violence & profanity), R+ - Mild Nudity, Rx - Hentai
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  season?: string; // winter, spring, summer, fall
  year?: number;
  broadcast?: JikanBroadcast;
  producers?: JikanEntity[];
  licensors?: JikanEntity[];
  studios?: JikanEntity[];
  genres?: JikanEntity[];
  explicit_genres?: JikanEntity[];
  themes?: JikanEntity[];
  demographics?: JikanEntity[];
  relations?: JikanRelation[];
  theme?: {
    openings?: string[];
    endings?: string[];
  };
  external?: JikanExternal[];
  streaming?: JikanStreaming[];
}

/**
 * Jikan Manga Data
 * Complete manga data structure from Jikan API
 */
export interface JikanMangaData {
  mal_id: number;
  url: string;
  images: JikanImages;
  approved: boolean;
  titles: JikanTitle[];
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  type?: string; // Manga, Novel, Light Novel, One-shot, Doujin, Manhwa, Manhua
  chapters?: number;
  volumes?: number;
  status?: string; // Finished, Publishing, On Hiatus, Discontinued, Not yet published
  publishing: boolean;
  published: JikanAired;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  authors?: JikanEntity[];
  serializations?: JikanEntity[];
  genres?: JikanEntity[];
  explicit_genres?: JikanEntity[];
  themes?: JikanEntity[];
  demographics?: JikanEntity[];
  relations?: JikanRelation[];
  external?: JikanExternal[];
}

/**
 * Jikan Anime Response
 * Response structure from Jikan API /anime/{id} endpoint
 */
export interface JikanAnimeResponse {
  data: JikanAnimeData;
}

/**
 * Jikan Manga Response
 * Response structure from Jikan API /manga/{id} endpoint
 */
export interface JikanMangaResponse {
  data: JikanMangaData;
}

/**
 * Jikan Full Anime Response
 * Response structure from Jikan API /anime/{id}/full endpoint
 */
export interface JikanAnimeFullResponse {
  data: JikanAnimeData;
}

/**
 * Jikan Full Manga Response
 * Response structure from Jikan API /manga/{id}/full endpoint
 */
export interface JikanMangaFullResponse {
  data: JikanMangaData;
}

/**
 * Jikan Pagination
 * Pagination information for search results
 */
export interface JikanPagination {
  last_visible_page?: number;
  has_next_page?: boolean;
  current_page?: number;
  items?: {
    count?: number;
    total?: number;
    per_page?: number;
  };
}

/**
 * Jikan Search Response
 * Response structure from Jikan API search endpoints
 */
export interface JikanSearchResponse<T> {
  data: T[];
  pagination: JikanPagination;
}

/**
 * Jikan Top Anime Response
 * Response structure from Jikan API /top/anime endpoint
 */
export interface JikanTopAnimeResponse {
  data: JikanAnimeData[];
  pagination: JikanPagination;
}

/**
 * Jikan Top Manga Response
 * Response structure from Jikan API /top/manga endpoint
 */
export interface JikanTopMangaResponse {
  data: JikanMangaData[];
  pagination: JikanPagination;
}

/**
 * Jikan Search Parameters
 * Parameters for searching anime/manga
 */
export interface JikanSearchParams {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
  score?: number;
  min_score?: number;
  max_score?: number;
  status?: string;
  rating?: string;
  sfw?: boolean;
  genres?: string;
  genres_exclude?: string;
  order_by?: string;
  sort?: 'asc' | 'desc';
  letter?: string;
  producers?: string;
  magazines?: string;
  start_date?: string;
  end_date?: string;
}
