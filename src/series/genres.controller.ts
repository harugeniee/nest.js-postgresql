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
import { CreateGenreDto, QueryGenreDto, UpdateGenreDto } from './dto';
import { GenresService } from './services/genres.service';

/**
 * Genres Controller
 *
 * Provides REST API endpoints for managing genres.
 * Genres are used to categorize and filter series by their themes and content.
 */
@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  /**
   * Create a new genre
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGenreDto: CreateGenreDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.genresService.create(createGenreDto);
  }

  /**
   * Get all genres with offset pagination and filters
   */
  @Get()
  async findAll(@Query() queryDto: QueryGenreDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return this.genresService.findAll(queryDto);
  }

  /**
   * Get a genre by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.genresService.findById(id);
  }

  /**
   * Update a genre
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.genresService.update(id, updateGenreDto);
  }

  /**
   * Delete a genre (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    await this.genresService.softDelete(id);
  }
}
