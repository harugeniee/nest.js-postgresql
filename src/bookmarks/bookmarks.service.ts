import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
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
    private readonly folderRepository: Repository<BookmarkFolder>,
  ) {
    super(bookmarkRepository as any, {
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
      const folder = await this.folderRepository.findOne({
        where: { id: data.folderId, userId },
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
      const folder = await this.folderRepository.findOne({
        where: { id: data.folderId, userId },
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
  ): Promise<{ data: Bookmark[]; total: number }> {
    const queryBuilder = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .leftJoinAndSelect('bookmark.folder', 'folder')
      .where('bookmark.userId = :userId', { userId })
      .andWhere('bookmark.status != :deletedStatus', {
        deletedStatus: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.DELETED,
      });

    // Apply filters
    if (query.bookmarkableType) {
      queryBuilder.andWhere('bookmark.bookmarkableType = :type', {
        type: query.bookmarkableType,
      });
    }

    if (query.folderId) {
      queryBuilder.andWhere('bookmark.folderId = :folderId', {
        folderId: query.folderId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('bookmark.status = :status', {
        status: query.status,
      });
    }

    if (query.tags) {
      const tags = query.tags.split(',').map((tag) => tag.trim());
      queryBuilder.andWhere(
        tags.map((_, index) => `bookmark.tags ILIKE :tag${index}`).join(' OR '),
        tags.reduce((params, tag, index) => {
          params[`tag${index}`] = `%${tag}%`;
          return params;
        }, {}),
      );
    }

    if (query.isFavorite !== undefined) {
      queryBuilder.andWhere('bookmark.isFavorite = :isFavorite', {
        isFavorite: query.isFavorite,
      });
    }

    if (query.isReadLater !== undefined) {
      queryBuilder.andWhere('bookmark.isReadLater = :isReadLater', {
        isReadLater: query.isReadLater,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(bookmark.note ILIKE :search OR bookmark.tags ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Apply sorting
    if (query.sortBy) {
      const [field, direction] = query.sortBy.split('_');
      queryBuilder.orderBy(
        `bookmark.${field}`,
        direction.toUpperCase() as 'ASC' | 'DESC',
      );
    } else {
      queryBuilder.orderBy('bookmark.createdAt', 'DESC');
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = Math.min(
      query.limit || 20,
      BOOKMARK_CONSTANTS.MAX_BOOKMARKS_PER_PAGE,
    );
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
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
    const folder = this.folderRepository.create({
      ...data,
      userId,
    });

    return await this.folderRepository.save(folder);
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
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
    });

    if (!folder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (folder.isSystemFolder()) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_CANNOT_BE_MODIFIED' },
        HttpStatus.FORBIDDEN,
      );
    }

    Object.assign(folder, data);
    return await this.folderRepository.save(folder);
  }

  /**
   * Delete a bookmark folder
   * @param id - Folder ID
   * @param userId - ID of the user deleting the folder
   * @returns {Promise<void>}
   */
  async deleteFolder(id: string, userId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
      relations: ['bookmarks'],
    });

    if (!folder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!folder.canBeDeleted()) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_CANNOT_BE_DELETED' },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.folderRepository.remove(folder);
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
  ): Promise<{ data: BookmarkFolder[]; total: number }> {
    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .leftJoinAndSelect('folder.bookmarks', 'bookmarks')
      .where('folder.userId = :userId', { userId });

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('folder.type = :type', { type: query.type });
    }

    if (query.visibility) {
      queryBuilder.andWhere('folder.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    if (query.isDefault !== undefined) {
      queryBuilder.andWhere('folder.isDefault = :isDefault', {
        isDefault: query.isDefault,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(folder.name ILIKE :search OR folder.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy('folder.sortOrder', 'ASC');
    queryBuilder.addOrderBy('folder.createdAt', 'DESC');

    // Apply pagination
    const page = query.page || 1;
    const limit = Math.min(
      query.limit || 20,
      BOOKMARK_CONSTANTS.MAX_FOLDERS_PER_PAGE,
    );
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
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
      this.folderRepository.count({ where: { userId } }),
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
    const folders = await this.folderRepository.find({
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
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
      relations: ['bookmarks'],
    });

    if (!folder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return folder;
  }

  /**
   * Get all folders (admin only)
   * @param query - Query parameters
   * @returns {Promise<[BookmarkFolder[], number]>} Folders and total count
   */
  async getAllFolders(query: any): Promise<[BookmarkFolder[], number]> {
    return await this.folderRepository.findAndCount({
      ...query,
      relations: ['user', 'bookmarks'],
    });
  }

  /**
   * List bookmarks with pagination (admin only)
   * @param query - Query parameters
   * @returns {Promise<{data: Bookmark[], total: number}>} Paginated bookmarks
   */
  async list(query: any): Promise<{ data: Bookmark[]; total: number }> {
    const [data, total] = await this.bookmarkRepository.findAndCount({
      ...query,
      relations: ['user', 'folder'],
    });

    return { data, total };
  }
}
