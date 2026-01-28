import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { SERIES_CONSTANTS } from 'src/shared/constants';

/**
 * DTO for syncing series from Jikan API
 */
export class SyncJikanDto {
  /**
   * MyAnimeList ID (MAL ID) of the anime or manga to sync
   */
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  myAnimeListId: number;

  /**
   * Type of media (anime or manga)
   * If not provided, the service will try to detect from the data
   */
  @IsOptional()
  @IsEnum([SERIES_CONSTANTS.TYPE.ANIME, SERIES_CONSTANTS.TYPE.MANGA])
  type?: 'anime' | 'manga';
}
