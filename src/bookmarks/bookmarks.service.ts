import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, FindOptionsWhere } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkFolder } from './entities/bookmark-folder.entity';
import {
  CreateBookmarkDto,
  UpdateBookmarkDto,
  CreateBookmarkFolderDto,
  UpdateBookmarkFolderDto,
  QueryBookmarksDto,
  QueryBookmarkFoldersDto,
  BookmarkStatsDto,
} from './dto';
import { BOOKMARK_CONSTANTS, BookmarkableType } from 'src/shared/constants';
import { BookmarkFolderService } from './services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { IPagination } from 'src/common/interface/pagination.interface';
import { AdvancedPaginationDto } from 'src/common/dto';

/**
 * Bookmark Service
 *
 * Handles all bookmark-related business logic
 * Extends BaseService for common CRUD operations
 */
@Injectable()
export class BookmarksService extends BaseService<Bookmark> {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,

    @InjectRepository(BookmarkFolder)
    private readonly bookmarkFolderRepository: Repository<BookmarkFolder>,

    private readonly bookmarkFolderService: BookmarkFolderService,
  ) {
    super(new TypeOrmBaseRepository<Bookmark>(bookmarkRepository), {
      entityName: 'Bookmark',
      relationsWhitelist: {
        user: true,
        folder: true,
      },
      softDelete: true, // Explicitly set soft delete to avoid the method call
    });
  }

  /**
   * Create a new bookmark
   * @param userId - ID of the user creating the bookmark
   * @param data - Bookmark creation data
   * @returns {Promise<Bookmark>} Created bookmark
   */
  async createBookmark(
    userId: string,
    data: CreateBookmarkDto,
  ): Promise<Bookmark> {
    // Check if bookmark already exists
    const existingBookmark = await this.bookmarkRepository.findOne({
      where: {
        userId,
        bookmarkableType: data.bookmarkableType,
        bookmarkableId: data.bookmarkableId,
      },
    });

    if (existingBookmark) {
      throw new HttpException(
        { messageKey: 'bookmark.BOOKMARK_ALREADY_EXISTS' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate folder if provided
    if (data.folderId) {
      const folder = await this.bookmarkFolderService.findOne({
        id: data.folderId,
        userId,
      });
      if (!folder) {
        throw new HttpException(
          { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // Create bookmark
    const bookmark = this.bookmarkRepository.create({
      ...data,
      userId,
      tags: data.tags ? data.tags.join(', ') : undefined,
    });

    return await this.bookmarkRepository.save(bookmark);
  }

  /**
   * Update an existing bookmark
   * @param id - Bookmark ID
   * @param userId - ID of the user updating the bookmark
   * @param data - Update data
   * @returns {Promise<Bookmark>} Updated bookmark
   */
  async updateBookmark(
    id: string,
    userId: string,
    data: UpdateBookmarkDto,
  ): Promise<Bookmark> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, userId },
    });

    if (!bookmark) {
      throw new HttpException(
        { messageKey: 'bookmark.BOOKMARK_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate folder if provided
    if (data.folderId) {
      const folder = await this.bookmarkFolderService.findOne({
        id: data.folderId,
        userId,
      });
      if (!folder) {
        throw new HttpException(
          { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // Update bookmark
    Object.assign(bookmark, {
      ...data,
      tags: data.tags ? data.tags.join(', ') : bookmark.tags,
    });

    return await this.bookmarkRepository.save(bookmark);
  }

  /**
   * Remove a bookmark (soft delete)
   * @param id - Bookmark ID
   * @param userId - ID of the user removing the bookmark
   * @returns {Promise<void>}
   */
  async removeBookmark(id: string, userId: string): Promise<void> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id, userId },
    });

    if (!bookmark) {
      throw new HttpException(
        { messageKey: 'bookmark.BOOKMARK_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.bookmarkRepository.update(id, {
      status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.DELETED,
    });
  }

  /**
   * Get user's bookmarks with filtering and pagination
   * @param userId - User ID
   * @param query - Query parameters
   * @returns {Promise<{data: Bookmark[], total: number}>} Paginated bookmarks
   */
  async getUserBookmarks(
    userId: string,
    query: QueryBookmarksDto,
  ): Promise<IPagination<Bookmark>> {
    // Build where condition for BaseService
    const where: FindOptionsWhere<Bookmark> = {
      userId,
      status: Not(BOOKMARK_CONSTANTS.BOOKMARK_STATUS.DELETED),
    };

    // Use BaseService listOffset for standard filtering
    const result = await this.listOffset(query, where, {
      relations: ['folder'],
    });

    return result;
  }

  /**
   * Create a new bookmark folder
   * @param userId - ID of the user creating the folder
   * @param data - Folder creation data
   * @returns {Promise<BookmarkFolder>} Created folder
   */
  async createFolder(
    userId: string,
    data: CreateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    return await this.bookmarkFolderService.createFolder(userId, data);
  }

  /**
   * Update an existing bookmark folder
   * @param id - Folder ID
   * @param userId - ID of the user updating the folder
   * @param data - Update data
   * @returns {Promise<BookmarkFolder>} Updated folder
   */
  async updateFolder(
    id: string,
    userId: string,
    data: UpdateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    return await this.bookmarkFolderService.updateFolder(id, userId, data);
  }

  /**
   * Delete a bookmark folder
   * @param id - Folder ID
   * @param userId - ID of the user deleting the folder
   * @returns {Promise<void>}
   */
  async deleteFolder(id: string, userId: string): Promise<void> {
    return await this.bookmarkFolderService.deleteFolder(id, userId);
  }

  /**
   * Get user's folders
   * @param userId - User ID
   * @param query - Query parameters
   * @returns {Promise<{data: BookmarkFolder[], total: number}>} Paginated folders
   */
  async getUserFolders(
    userId: string,
    query: QueryBookmarkFoldersDto,
  ): Promise<IPagination<BookmarkFolder>> {
    return await this.bookmarkFolderService.getUserFolders(userId, query);
  }

  /**
   * Get bookmark statistics for a user
   * @param userId - User ID
   * @returns {Promise<BookmarkStatsDto>} Bookmark statistics
   */
  async getBookmarkStats(userId: string): Promise<BookmarkStatsDto> {
    // Get basic counts
    const [
      totalBookmarks,
      activeBookmarks,
      archivedBookmarks,
      favoriteBookmarks,
      readLaterBookmarks,
      totalFolders,
    ] = await Promise.all([
      this.bookmarkRepository.count({
        where: {
          userId,
          status: In([
            BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
            BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED,
          ]),
        },
      }),
      this.bookmarkRepository.count({
        where: { userId, status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE },
      }),
      this.bookmarkRepository.count({
        where: { userId, status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED },
      }),
      this.bookmarkRepository.count({
        where: {
          userId,
          isFavorite: true,
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        },
      }),
      this.bookmarkRepository.count({
        where: {
          userId,
          isReadLater: true,
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        },
      }),
      this.bookmarkFolderRepository.count({ where: { userId } }),
    ]);

    // Get bookmarks by type using TypeORM methods
    const activeBookmarksData = await this.bookmarkRepository.find({
      where: {
        userId,
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
      },
      select: ['bookmarkableType'],
    });

    const bookmarksByTypeMap = activeBookmarksData.reduce(
      (acc, bookmark) => {
        acc[bookmark.bookmarkableType] =
          (acc[bookmark.bookmarkableType] || 0) + 1;
        return acc;
      },
      {} as Record<BookmarkableType, number>,
    );

    // Get top tags using TypeORM methods
    const bookmarksWithTags = await this.bookmarkRepository.find({
      where: {
        userId,
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        tags: Not(IsNull()),
      },
      select: ['tags'],
    });

    const tagCounts: Record<string, number> = {};
    bookmarksWithTags.forEach((bookmark) => {
      if (bookmark.tags && bookmark.tags.trim() !== '') {
        const tags = bookmark.tags.split(',').map((tag) => tag.trim());
        tags.forEach((tag) => {
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get folders with counts using TypeORM methods
    const folders = await this.bookmarkFolderRepository.find({
      where: { userId },
      relations: ['bookmarks'],
      order: { sortOrder: 'ASC' },
    });

    const foldersWithCounts = folders.map((folder) => ({
      folderId: folder.id,
      folderName: folder.name,
      bookmarkCount:
        folder.bookmarks?.filter(
          (bookmark) =>
            bookmark.status === BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        ).length || 0,
    }));

    return {
      totalBookmarks,
      activeBookmarks,
      archivedBookmarks,
      favoriteBookmarks,
      readLaterBookmarks,
      totalFolders,
      bookmarksByType: bookmarksByTypeMap,
      topTags,
      foldersWithCounts,
    };
  }

  /**
   * Check if content is bookmarked by user
   * @param userId - User ID
   * @param bookmarkableType - Type of content
   * @param bookmarkableId - ID of content
   * @returns {Promise<boolean>} True if bookmarked
   */
  async isBookmarked(
    userId: string,
    bookmarkableType: BookmarkableType,
    bookmarkableId: string,
  ): Promise<boolean> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: {
        userId,
        bookmarkableType,
        bookmarkableId,
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
      },
    });

    return !!bookmark;
  }

  /**
   * Get bookmark for specific content
   * @param userId - User ID
   * @param bookmarkableType - Type of content
   * @param bookmarkableId - ID of content
   * @returns {Promise<Bookmark | null>} Bookmark if exists
   */
  async getBookmarkForContent(
    userId: string,
    bookmarkableType: BookmarkableType,
    bookmarkableId: string,
  ): Promise<Bookmark | null> {
    return await this.bookmarkRepository.findOne({
      where: {
        userId,
        bookmarkableType,
        bookmarkableId,
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
      },
      relations: ['folder'],
    });
  }

  /**
   * Get folder by ID for a specific user
   * @param id - Folder ID
   * @param userId - User ID
   * @returns {Promise<BookmarkFolder>} Folder
   */
  async getFolderById(id: string, userId: string): Promise<BookmarkFolder> {
    return await this.bookmarkFolderService.getFolderById(id, userId);
  }

  /**
   * Get all folders (admin only)
   * @param query - Query parameters
   * @returns {Promise<[BookmarkFolder[], number]>} Folders and total count
   */
  async getAllFolders(
    query: AdvancedPaginationDto,
  ): Promise<IPagination<BookmarkFolder>> {
    return await this.bookmarkFolderService.getAllFolders(query);
  }

  /**
   * List bookmarks with pagination (admin only)
   * @param query - Query parameters
   * @returns {Promise<{data: Bookmark[], total: number}>} Paginated bookmarks
   */
  async list(query: AdvancedPaginationDto): Promise<IPagination<Bookmark>> {
    // Use BaseService listOffset method
    const result = await this.listOffset(query, {
      relations: ['user', 'folder'],
    });

    return result;
  }
}
