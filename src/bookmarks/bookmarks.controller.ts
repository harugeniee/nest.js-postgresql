import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { USER_CONSTANTS } from 'src/shared/constants';
import { BookmarksService } from './bookmarks.service';
import {
  CreateBookmarkDto,
  UpdateBookmarkDto,
  CreateBookmarkFolderDto,
  UpdateBookmarkFolderDto,
  QueryBookmarksDto,
  QueryBookmarkFoldersDto,
  BookmarkStatsDto,
} from './dto';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkFolder } from './entities/bookmark-folder.entity';

/**
 * Bookmarks Controller
 *
 * Handles all bookmark-related API endpoints
 * Provides CRUD operations for bookmarks and folders
 */
@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAccessTokenGuard)
@ApiBearerAuth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * Create a new bookmark
   */
  @Post()
  @ApiOperation({ summary: 'Create a new bookmark' })
  @ApiResponse({
    status: 201,
    description: 'Bookmark created successfully',
    type: Bookmark,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createBookmark(
    @Request() req: any,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ): Promise<Bookmark> {
    return await this.bookmarksService.createBookmark(
      req.user.uid,
      createBookmarkDto,
    );
  }

  /**
   * Get user's bookmarks with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get user bookmarks' })
  @ApiResponse({
    status: 200,
    description: 'Bookmarks retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Bookmark' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getUserBookmarks(
    @Request() req: any,
    @Query() query: QueryBookmarksDto,
  ): Promise<{
    data: Bookmark[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { data, total } = await this.bookmarksService.getUserBookmarks(
      req.user.uid,
      query,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a specific bookmark
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific bookmark' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark retrieved successfully',
    type: Bookmark,
  })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async getBookmark(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Bookmark> {
    const bookmark = await this.bookmarksService.findOne(
      id as any,
      {
        userId: req.user.uid,
        relations: ['folder'],
      } as any,
    );

    if (!bookmark) {
      throw new Error('Bookmark not found');
    }

    return bookmark;
  }

  /**
   * Update a bookmark
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a bookmark' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark updated successfully',
    type: Bookmark,
  })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async updateBookmark(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ): Promise<Bookmark> {
    return await this.bookmarksService.updateBookmark(
      id,
      req.user.uid,
      updateBookmarkDto,
    );
  }

  /**
   * Remove a bookmark
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a bookmark' })
  @ApiResponse({ status: 204, description: 'Bookmark removed successfully' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async removeBookmark(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.bookmarksService.removeBookmark(id, req.user.uid);
  }

  /**
   * Check if content is bookmarked
   */
  @Get('check/:type/:id')
  @ApiOperation({ summary: 'Check if content is bookmarked' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isBookmarked: { type: 'boolean' },
        bookmark: { $ref: '#/components/schemas/Bookmark' },
      },
    },
  })
  async checkBookmark(
    @Request() req: any,
    @Param('type') type: string,
    @Param('id') id: string,
  ): Promise<{ isBookmarked: boolean; bookmark?: Bookmark | null }> {
    const isBookmarked = await this.bookmarksService.isBookmarked(
      req.user.uid,
      type as any,
      id,
    );

    let bookmark: Bookmark | null = null;
    if (isBookmarked) {
      bookmark = await this.bookmarksService.getBookmarkForContent(
        req.user.uid,
        type as any,
        id,
      );
    }

    return { isBookmarked, bookmark };
  }

  /**
   * Get bookmark statistics
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get bookmark statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: BookmarkStatsDto,
  })
  async getBookmarkStats(@Request() req: any): Promise<BookmarkStatsDto> {
    return await this.bookmarksService.getBookmarkStats(req.user.uid);
  }

  // Folder endpoints

  /**
   * Create a new bookmark folder
   */
  @Post('folders')
  @ApiOperation({ summary: 'Create a new bookmark folder' })
  @ApiResponse({
    status: 201,
    description: 'Folder created successfully',
    type: BookmarkFolder,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createFolder(
    @Request() req: any,
    @Body() createFolderDto: CreateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    return await this.bookmarksService.createFolder(
      req.user.uid,
      createFolderDto,
    );
  }

  /**
   * Get user's bookmark folders
   */
  @Get('folders')
  @ApiOperation({ summary: 'Get user bookmark folders' })
  @ApiResponse({
    status: 200,
    description: 'Folders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/BookmarkFolder' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getUserFolders(
    @Request() req: any,
    @Query() query: QueryBookmarkFoldersDto,
  ): Promise<{
    data: BookmarkFolder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { data, total } = await this.bookmarksService.getUserFolders(
      req.user.uid,
      query,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a specific folder
   */
  @Get('folders/:id')
  @ApiOperation({ summary: 'Get a specific bookmark folder' })
  @ApiResponse({
    status: 200,
    description: 'Folder retrieved successfully',
    type: BookmarkFolder,
  })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async getFolder(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<BookmarkFolder> {
    return await this.bookmarksService.getFolderById(id, req.user.uid);
  }

  /**
   * Update a folder
   */
  @Put('folders/:id')
  @ApiOperation({ summary: 'Update a bookmark folder' })
  @ApiResponse({
    status: 200,
    description: 'Folder updated successfully',
    type: BookmarkFolder,
  })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async updateFolder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    return await this.bookmarksService.updateFolder(
      id,
      req.user.uid,
      updateFolderDto,
    );
  }

  /**
   * Delete a folder
   */
  @Delete('folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark folder' })
  @ApiResponse({ status: 204, description: 'Folder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async deleteFolder(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    await this.bookmarksService.deleteFolder(id, req.user.uid);
  }

  // Admin endpoints

  /**
   * Get all bookmarks (admin only)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR)
  @ApiOperation({ summary: 'Get all bookmarks (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All bookmarks retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Bookmark' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllBookmarks(@Query() query: QueryBookmarksDto): Promise<{
    data: Bookmark[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { data, total } = await this.bookmarksService.list(query as any);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get all folders (admin only)
   */
  @Get('admin/folders')
  @UseGuards(RolesGuard)
  @Roles(USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR)
  @ApiOperation({ summary: 'Get all bookmark folders (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All folders retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/BookmarkFolder' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllFolders(@Query() query: QueryBookmarkFoldersDto): Promise<{
    data: BookmarkFolder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await this.bookmarksService.getAllFolders(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
