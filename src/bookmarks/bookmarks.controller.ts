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
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { USER_CONSTANTS } from 'src/shared/constants';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';
import { BookmarksService } from './bookmarks.service';
import {
  CreateBookmarkDto,
  UpdateBookmarkDto,
  CreateBookmarkFolderDto,
  UpdateBookmarkFolderDto,
  QueryBookmarksDto,
  QueryBookmarkFoldersDto,
} from './dto';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface/auth.interface';
import { SnowflakeIdPipe } from 'src/common/pipes/snowflake-id.pipe';

/**
 * Bookmarks Controller
 *
 * Handles all bookmark-related API endpoints
 * Provides CRUD operations for bookmarks and folders
 */
@Controller('bookmarks')
@Auth()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * Create a new bookmark
   */
  @Post()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.BOOKMARK_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.ENGAGEMENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.BOOKMARK,
  )
  @UseInterceptors(AnalyticsInterceptor)
  createBookmark(
    @Request() req: Request & { user: AuthPayload },
    @Body() createBookmarkDto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createBookmark(
      req.user.uid,
      createBookmarkDto,
    );
  }

  /**
   * Get user's bookmarks with filtering and pagination
   */
  @Get()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.BOOKMARK_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.ENGAGEMENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.BOOKMARK,
  )
  @UseInterceptors(AnalyticsInterceptor)
  getUserBookmarks(
    @Request() req: Request & { user: AuthPayload },
    @Query() query: QueryBookmarksDto,
  ) {
    return this.bookmarksService.getUserBookmarks(req.user.uid, query);
  }

  /**
   * Get a specific bookmark
   */
  @Get(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.BOOKMARK_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.ENGAGEMENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.BOOKMARK,
  )
  @UseInterceptors(AnalyticsInterceptor)
  getBookmark(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
  ) {
    return this.bookmarksService.findOne(
      {
        id,
      },
      {
        relations: ['folder'],
      },
    );
  }

  /**
   * Update a bookmark
   */
  @Put(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.BOOKMARK_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.ENGAGEMENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.BOOKMARK,
  )
  @UseInterceptors(AnalyticsInterceptor)
  updateBookmark(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.updateBookmark(
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
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.BOOKMARK_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.ENGAGEMENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.BOOKMARK,
  )
  @UseInterceptors(AnalyticsInterceptor)
  removeBookmark(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
  ) {
    return this.bookmarksService.removeBookmark(id, req.user.uid);
  }

  /**
   * Get bookmark statistics
   */
  @Get('stats/overview')
  getBookmarkStats(@Request() req: Request & { user: AuthPayload }) {
    return this.bookmarksService.getBookmarkStats(req.user.uid);
  }

  // Folder endpoints

  /**
   * Create a new bookmark folder
   */
  @Post('folders')
  createFolder(
    @Request() req: Request & { user: AuthPayload },
    @Body() createFolderDto: CreateBookmarkFolderDto,
  ) {
    return this.bookmarksService.createFolder(req.user.uid, createFolderDto);
  }

  /**
   * Get user's bookmark folders
   */
  @Get('folders')
  getUserFolders(
    @Request() req: Request & { user: AuthPayload },
    @Query() query: QueryBookmarkFoldersDto,
  ) {
    return this.bookmarksService.getUserFolders(req.user.uid, query);
  }

  /**
   * Get a specific folder
   */
  @Get('folders/:id')
  getFolder(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
  ) {
    return this.bookmarksService.getFolderById(id, req.user.uid);
  }

  /**
   * Update a folder
   */
  @Put('folders/:id')
  updateFolder(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateFolderDto: UpdateBookmarkFolderDto,
  ) {
    return this.bookmarksService.updateFolder(
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
  deleteFolder(
    @Request() req: Request & { user: AuthPayload },
    @Param('id', new SnowflakeIdPipe()) id: string,
  ) {
    return this.bookmarksService.deleteFolder(id, req.user.uid);
  }

  // Admin endpoints

  /**
   * Get all bookmarks (admin only)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR)
  getAllBookmarks(@Query() query: QueryBookmarksDto) {
    return this.bookmarksService.list(query);
  }

  /**
   * Get all folders (admin only)
   */
  @Get('admin/folders')
  @UseGuards(RolesGuard)
  @Roles(USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR)
  getAllFolders(@Query() query: QueryBookmarkFoldersDto) {
    return this.bookmarksService.getAllFolders(query);
  }
}
