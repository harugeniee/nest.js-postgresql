/**
 * Jikan API Types
 *
 * TypeScript interfaces for Jikan API responses
 * Based on Jikan API v4 documentation: https://docs.api.jikan.moe/
 */

/**
 * Jikan Character Images
 * Contains image URLs in different formats
 */
export interface JikanCharacterImages {
  jpg: {
    image_url: string;
  };
  webp: {
    image_url: string;
    small_image_url: string;
  };
}

/**
 * Jikan Character
 * Character information from Jikan API
 */
export interface JikanCharacter {
  mal_id: number;
  url: string;
  images: JikanCharacterImages;
  name: string;
}

/**
 * Jikan Character Entry
 * Character entry with role information
 */
export interface JikanCharacterEntry {
  character: JikanCharacter;
  role: string; // "Main", "Supporting", etc.
}

/**
 * Jikan Character Response
 * Response structure from Jikan API /manga/{id}/characters endpoint
 */
export interface JikanCharacterResponse {
  data: JikanCharacterEntry[];
}
