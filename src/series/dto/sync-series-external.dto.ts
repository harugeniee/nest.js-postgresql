import { IsIn, IsOptional } from 'class-validator';

/**
 * DTO for syncing series from external sources
 *
 * If source is not provided, auto-detect:
 * - Priority: aniListId -> myAnimeListId
 * - If neither exists, return 400 error
 */
export class SyncSeriesExternalDto {
  @IsOptional()
  @IsIn(['jikan', 'anilist'])
  source?: 'jikan' | 'anilist';
}
