import {
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
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CharactersService } from './characters.service';
import {
  CharacterStatsDto,
  CreateCharacterDto,
  QueryCharacterCursorDto,
  QueryCharacterDto,
  UpdateCharacterDto,
} from './dto';

@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  /**
   * Create a new character
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCharacterDto: CreateCharacterDto) {
    return this.charactersService.create(createCharacterDto);
  }

  /**
   * Get all characters with offset pagination
   */
  @Get()
  async findAll(@Query() queryDto: QueryCharacterDto) {
    return this.charactersService.findAll(queryDto);
  }

  /**
   * Get all characters with cursor pagination
   */
  @Get('cursor')
  async findAllCursor(@Query() queryDto: QueryCharacterCursorDto) {
    return this.charactersService.findAllCursor(queryDto);
  }

  /**
   * Get character statistics overview
   * Returns comprehensive statistics about characters including counts by status,
   * gender, blood type, voice actors, reactions, and top series
   */
  @Get('stats/overview')
  async getCharacterStatistics(): Promise<CharacterStatsDto> {
    const stats = await this.charactersService.getCharacterStatistics();
    return stats;
  }

  /**
   * Trigger character update from Jikan API for a specific series
   * Queues a job to fetch and update characters for the given series
   *
   * @param seriesId - Series ID to update characters for
   * @returns Job ID and status information
   */
  @Post('update/:seriesId')
  @Auth()
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerCharacterUpdate(
    @Param('seriesId', SnowflakeIdPipe) seriesId: string,
  ): Promise<{
    success: boolean;
    jobId: string;
    seriesId: string;
    myAnimeListId?: string;
    message: string;
  }> {
    return this.charactersService.triggerCharacterUpdate(seriesId);
  }

  /**
   * Get a character by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.charactersService.findById(id);
  }

  /**
   * Update a character
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateCharacterDto: UpdateCharacterDto,
  ) {
    return this.charactersService.update(id, updateCharacterDto);
  }

  /**
   * Delete a character (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.charactersService.softDelete(id);
  }

  /**
   * Get a character by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.charactersService.findByIdWithReactions(id, kindsArray);
  }
}
