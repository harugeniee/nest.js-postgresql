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
import { CursorPaginationDto } from 'src/common/dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import {
  CreateStaffDto,
  LinkCharactersDto,
  QueryStaffDto,
  QueryStaffSeriesDto,
  UpdateCharacterRoleDto,
  UpdateStaffDto,
} from './dto';
import { StaffsService } from './staffs.service';

@Controller('staffs')
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  /**
   * Create a new staff
   * Requires authentication
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffsService.createWithCharacters(createStaffDto);
  }

  /**
   * Get all staff with offset pagination
   */
  @Get()
  async findAll(@Query() queryDto: QueryStaffDto) {
    return this.staffsService.findAll(queryDto);
  }

  /**
   * Get all staff with cursor pagination
   */
  @Get('cursor')
  async findAllCursor(@Query() paginationDto: CursorPaginationDto) {
    return this.staffsService.findAllCursor(paginationDto);
  }

  /**
   * Get a staff by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.staffsService.findById(id, {
      relations: ['characterRoles', 'characterRoles.character'],
    });
  }

  /**
   * Update a staff
   * Requires authentication
   */
  @Patch(':id')
  @Auth()
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffsService.updateWithCharacters(id, updateStaffDto);
  }

  /**
   * Delete a staff (soft delete)
   * Requires authentication
   */
  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string) {
    return this.staffsService.softDelete(id);
  }

  /**
   * Get a staff by ID with reaction counts
   */
  @Get(':id/reactions')
  async findOneWithReactions(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query('kinds') kinds?: string,
  ) {
    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.staffsService.findByIdWithReactions(id, kindsArray);
  }

  /**
   * Link characters to a staff member with role information
   * Based on AniList API StaffRoleType: https://docs.anilist.co/reference/object/staffroletype
   */
  @Post(':id/characters')
  @Auth()
  @HttpCode(HttpStatus.OK)
  async linkCharacters(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() linkCharactersDto: LinkCharactersDto,
  ) {
    await this.staffsService.linkCharactersWithRoles(
      id,
      linkCharactersDto.characters,
    );
    return { message: 'Characters linked successfully' };
  }

  /**
   * Update a character role for a staff member
   * Updates language, isPrimary, sortOrder, or notes for a CharacterStaff relationship
   */
  @Patch(':id/characters/:characterStaffId')
  @Auth()
  async updateCharacterRole(
    @Param('id', SnowflakeIdPipe) id: string,
    @Param('characterStaffId', SnowflakeIdPipe) characterStaffId: string,
    @Body() updateDto: UpdateCharacterRoleDto,
  ) {
    await this.staffsService.updateCharacterRole(
      id,
      characterStaffId,
      updateDto,
    );
    return { message: 'Character role updated successfully' };
  }

  /**
   * Remove a character role from a staff member
   * Deletes the CharacterStaff junction entity
   */
  @Delete(':id/characters/:characterStaffId')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCharacterRole(
    @Param('id', SnowflakeIdPipe) id: string,
    @Param('characterStaffId', SnowflakeIdPipe) characterStaffId: string,
  ) {
    await this.staffsService.removeCharacterRole(id, characterStaffId);
  }

  /**
   * Get series that a staff member has worked on with offset pagination
   * Returns StaffSeries objects with series information and role details
   */
  @Get(':id/series')
  async getStaffSeries(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query() queryDto: QueryStaffSeriesDto,
  ) {
    return this.staffsService.findSeriesByStaffId(id, queryDto);
  }

  /**
   * Get series that a staff member has worked on with cursor pagination
   * Returns StaffSeries objects with series information and role details
   */
  @Get(':id/series/cursor')
  async getStaffSeriesCursor(
    @Param('id', SnowflakeIdPipe) id: string,
    @Query() cursorDto: CursorPaginationDto,
  ) {
    return this.staffsService.findSeriesByStaffIdCursor(id, cursorDto);
  }
}
