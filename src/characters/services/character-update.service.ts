import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Character, CharacterName } from '../entities/character.entity';
import { JikanCharacterEntry, JikanCharacterResponse } from './jikan.types';

/**
 * Character Update Service
 *
 * Service for updating Character entities from Jikan API data
 * Handles mapping, matching, and updating characters
 */
@Injectable()
export class CharacterUpdateService {
  private readonly logger = new Logger(CharacterUpdateService.name);

  constructor(
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Update characters from Jikan API response
   *
   * @param seriesId - Series ID to associate characters with
   * @param jikanData - Character data from Jikan API
   * @returns Promise with update statistics
   */
  async updateCharactersFromJikan(
    seriesId: string,
    jikanData: JikanCharacterResponse,
  ): Promise<{
    processed: number;
    created: number;
    updated: number;
  }> {
    if (!jikanData.data || jikanData.data.length === 0) {
      this.logger.debug(
        `No characters found in Jikan response for series ${seriesId}`,
      );
      return { processed: 0, created: 0, updated: 0 };
    }

    let processed = 0;
    let created = 0;
    let updated = 0;

    // Use transaction for batch updates
    await this.dataSource.transaction(async (manager) => {
      for (const entry of jikanData.data) {
        try {
          const character = await this.findOrCreateCharacter(
            manager,
            seriesId,
            entry,
          );

          if (character.isNew) {
            created++;
          } else {
            updated++;
          }

          processed++;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to process character ${entry.character.mal_id}: ${errorMessage}`,
          );
          // Continue with next character instead of failing entire batch
        }
      }
    });

    this.logger.log(
      `Processed ${processed} characters for series ${seriesId}: ${created} created, ${updated} updated`,
    );

    return { processed, created, updated };
  }

  /**
   * Find existing character or create new one
   *
   * @param manager - Entity manager for transaction
   * @param seriesId - Series ID
   * @param entry - Jikan character entry
   * @returns Character entity and whether it was newly created
   */
  private async findOrCreateCharacter(
    manager: EntityManager,
    seriesId: string,
    entry: JikanCharacterEntry,
  ): Promise<{ character: Character; isNew: boolean }> {
    const jikanChar = entry.character;
    const malId = jikanChar.mal_id.toString();

    // Try to find by myAnimeListId first (most reliable)
    let character = await manager.findOne(Character, {
      where: { myAnimeListId: malId },
    });

    if (character) {
      // Update existing character
      this.updateCharacterFromJikan(character, entry, seriesId);
      await manager.save(Character, character);
      return { character, isNew: false };
    }

    // Try to find by name (fallback matching)
    character = await this.findCharacterByName(
      manager,
      jikanChar.name,
      seriesId,
    );

    if (character) {
      // Update existing character
      this.updateCharacterFromJikan(character, entry, seriesId);
      await manager.save(Character, character);
      return { character, isNew: false };
    }

    // Create new character
    character = this.createCharacterFromJikan(entry, seriesId);
    await manager.save(Character, character);
    return { character, isNew: true };
  }

  /**
   * Find character by name (check alternative[], full, userPreferred)
   *
   * @param manager - Entity manager
   * @param name - Name to search for
   * @param seriesId - Series ID to filter by
   * @returns Character if found, null otherwise
   */
  private async findCharacterByName(
    manager: EntityManager,
    name: string,
    seriesId: string,
  ): Promise<Character | null> {
    // Search in alternative names
    // Use -> instead of ->> to get JSONB (not text) for @> operator
    // Use separate parameters for JSONB vs text comparisons to avoid type conflicts
    const characters = await manager
      .createQueryBuilder(Character, 'character')
      .where('character.seriesId = :seriesId', { seriesId })
      .andWhere(
        "(character.name->'alternative' @> :nameJsonb::jsonb OR character.name->>'full' = :nameText OR character.name->>'userPreferred' = :nameText)",
        {
          nameJsonb: JSON.stringify([name]),
          nameText: name,
        },
      )
      .getMany();

    // Case-insensitive matching
    for (const char of characters) {
      if (this.nameMatches(char.name, name)) {
        return char;
      }
    }

    return null;
  }

  /**
   * Check if character name matches the given name (case-insensitive)
   *
   * @param characterName - Character name object
   * @param searchName - Name to search for
   * @returns True if matches
   */
  private nameMatches(
    characterName: CharacterName | undefined,
    searchName: string,
  ): boolean {
    if (!characterName) {
      return false;
    }

    const searchLower = searchName.toLowerCase().trim();

    // Check alternative array
    if (characterName.alternative) {
      for (const alt of characterName.alternative) {
        if (alt.toLowerCase().trim() === searchLower) {
          return true;
        }
      }
    }

    // Check full name
    if (
      characterName.full &&
      characterName.full.toLowerCase().trim() === searchLower
    ) {
      return true;
    }

    // Check userPreferred
    if (
      characterName.userPreferred &&
      characterName.userPreferred.toLowerCase().trim() === searchLower
    ) {
      return true;
    }

    return false;
  }

  /**
   * Update existing character from Jikan data
   *
   * @param character - Character entity to update
   * @param entry - Jikan character entry
   * @param seriesId - Series ID
   */
  private updateCharacterFromJikan(
    character: Character,
    entry: JikanCharacterEntry,
    seriesId: string,
  ): void {
    const jikanChar = entry.character;

    // Update myAnimeListId if not set
    if (!character.myAnimeListId) {
      character.myAnimeListId = jikanChar.mal_id.toString();
    }

    // Update siteMyAnimeListUrl
    character.siteMyAnimeListUrl = jikanChar.url;

    // Update imageUrls
    character.imageUrls = jikanChar.images as unknown as Record<string, JSON>;

    // Update role
    character.role = entry.role;

    // Update seriesId
    character.seriesId = seriesId;

    // Add name to alternative array if not exists
    character.name = this.addNameToAlternative(character.name, jikanChar.name);
  }

  /**
   * Create new character from Jikan data
   *
   * @param entry - Jikan character entry
   * @param seriesId - Series ID
   * @returns New Character entity
   */
  private createCharacterFromJikan(
    entry: JikanCharacterEntry,
    seriesId: string,
  ): Character {
    const jikanChar = entry.character;
    const character = new Character();

    character.myAnimeListId = jikanChar.mal_id.toString();
    character.siteMyAnimeListUrl = jikanChar.url;
    character.imageUrls = jikanChar.images as unknown as Record<string, JSON>;
    character.role = entry.role;
    character.seriesId = seriesId;

    // Initialize name with alternative array
    character.name = {
      alternative: [jikanChar.name],
    };

    return character;
  }

  /**
   * Add name to alternative array if not exists
   *
   * @param currentName - Current character name object
   * @param newName - New name to add
   * @returns Updated character name object
   */
  private addNameToAlternative(
    currentName: CharacterName | undefined,
    newName: string,
  ): CharacterName {
    // If no name object exists, create one
    if (!currentName) {
      return {
        alternative: [newName],
      };
    }

    // Initialize alternative array if it doesn't exist
    if (!currentName.alternative) {
      currentName.alternative = [];
    }

    // Check if name already exists (case-insensitive)
    const newNameLower = newName.toLowerCase().trim();
    const exists = currentName.alternative.some(
      (alt) => alt.toLowerCase().trim() === newNameLower,
    );

    // Add if not exists
    if (!exists) {
      currentName.alternative.push(newName);
    }

    return currentName;
  }
}
