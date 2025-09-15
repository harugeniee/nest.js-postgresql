import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { BaseService } from 'src/common/services/base.service';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BookmarkFolder } from '../entities/bookmark-folder.entity';
import {
  CreateBookmarkFolderDto,
  UpdateBookmarkFolderDto,
  QueryBookmarkFoldersDto,
} from '../dto';
import { BOOKMARK_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

/**
 * Bookmark Folder Service
 *
 * Handles all bookmark folder operations
 * Extends BaseService for common CRUD operations with caching and validation
 */
@Injectable()
export class BookmarkFolderService extends BaseService<BookmarkFolder> {
  constructor(
    @InjectRepository(BookmarkFolder)
    private readonly folderRepository: Repository<BookmarkFolder>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<BookmarkFolder>(folderRepository),
      {
        entityName: 'BookmarkFolder',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'bookmark-folders',
          swrSec: 60,
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          user: true,
          bookmarks: true,
        },
        emitEvents: true,
      },
      cacheService,
    );
  }

  /**
   * Define searchable columns for BookmarkFolder entity
   * @returns Array of searchable column names
   */
  protected getSearchableColumns(): (keyof BookmarkFolder)[] {
    return ['name', 'description'];
  }

  /**
   * Create a new bookmark folder
   * @param userId - ID of the user creating the folder
   * @param data - Folder creation data
   * @returns Created folder
   */
  async createFolder(
    userId: string,
    data: CreateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    // Check if folder name already exists for this user
    const existingFolder = await this.findOne({
      userId,
      name: data.name,
    });

    if (existingFolder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_ALREADY_EXISTS' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Set default values
    const folderData = {
      ...data,
      userId,
      type: data.type || BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
      visibility:
        data.visibility || BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
      isDefault: false,
      sortOrder: data.sortOrder || 0,
    };

    return await this.create(folderData);
  }

  /**
   * Update a bookmark folder
   * @param id - Folder ID
   * @param userId - ID of the user updating the folder
   * @param data - Folder update data
   * @returns Updated folder
   */
  async updateFolder(
    id: string,
    userId: string,
    data: UpdateBookmarkFolderDto,
  ): Promise<BookmarkFolder> {
    // Verify folder exists and belongs to user
    const folder = await this.findOne({
      id,
      userId,
    });

    if (!folder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if it's a system folder
    if (folder.isSystemFolder()) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_CANNOT_BE_MODIFIED' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== folder.name) {
      const existingFolder = await this.findOne({
        userId,
        name: data.name,
      });

      if (existingFolder) {
        throw new HttpException(
          { messageKey: 'bookmark.FOLDER_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return await this.update(id, data);
  }

  /**
   * Delete a bookmark folder
   * @param id - Folder ID
   * @param userId - ID of the user deleting the folder
   */
  async deleteFolder(id: string, userId: string): Promise<void> {
    // Verify folder exists and belongs to user
    const folder = await this.findOne({
      id,
      userId,
    });

    if (!folder) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if folder can be deleted
    if (!folder.canBeDeleted()) {
      throw new HttpException(
        { messageKey: 'bookmark.FOLDER_CANNOT_BE_DELETED' },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.remove(id);
  }

  /**
   * Get user's bookmark folders with pagination
   * @param userId - User ID
   * @param query - Query parameters
   * @returns Paginated folders
   */
  async getUserFolders(
    userId: string,
    query: QueryBookmarkFoldersDto,
  ): Promise<{ data: BookmarkFolder[]; total: number }> {
    const { page = 1, limit = 20, ...filters } = query;

    const where: any = {
      userId,
      ...filters,
    };

    // Use BaseService listOffset method with custom ordering
    const result = await this.listOffset({ page, limit, ...filters }, where, {
      relations: ['bookmarks'],
    });

    // Apply custom ordering after getting results
    result.result.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { data: result.result, total: result.total };
  }

  /**
   * Get a folder by ID for a specific user
   * @param id - Folder ID
   * @param userId - User ID
   * @returns Folder with relations
   */
  async getFolderById(id: string, userId: string): Promise<BookmarkFolder> {
    const folder = await this.findOne(
      { id, userId },
      {
        relations: ['bookmarks'],
      },
    );

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
   * @returns All folders with pagination
   */
  async getAllFolders(query: any): Promise<[BookmarkFolder[], number]> {
    const { page = 1, limit = 20, ...filters } = query;

    // Use BaseService listOffset method
    const result = await this.listOffset({ page, limit }, filters, {
      relations: ['user', 'bookmarks'],
    });

    return [result.result, result.total];
  }

  /**
   * Get folder statistics for a user
   * @param userId - User ID
   * @returns Folder statistics
   */
  async getFolderStats(userId: string): Promise<{
    totalFolders: number;
    customFolders: number;
    systemFolders: number;
    publicFolders: number;
    privateFolders: number;
    foldersWithCounts: Array<{
      folderId: string;
      folderName: string;
      bookmarkCount: number;
    }>;
  }> {
    // Get all folders for user
    const folders = await this.folderRepository.find({
      where: { userId },
      relations: ['bookmarks'],
      order: { sortOrder: 'ASC' },
    });

    // Calculate statistics
    const totalFolders = folders.length;
    const customFolders = folders.filter(
      (f) => f.type === BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
    ).length;
    const systemFolders = folders.filter(
      (f) => f.type === BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
    ).length;
    const publicFolders = folders.filter(
      (f) => f.visibility === BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC,
    ).length;
    const privateFolders = folders.filter(
      (f) => f.visibility === BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
    ).length;

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
      totalFolders,
      customFolders,
      systemFolders,
      publicFolders,
      privateFolders,
      foldersWithCounts,
    };
  }

  /**
   * Check if folder name exists for user
   * @param userId - User ID
   * @param name - Folder name
   * @param excludeId - Folder ID to exclude from check
   * @returns True if name exists
   */
  async isFolderNameExists(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const where: any = { userId, name };
    if (excludeId) {
      where.id = Not(excludeId);
    }

    const folder = await this.findOne(where);
    return !!folder;
  }

  /**
   * Get default folders for user
   * @param userId - User ID
   * @returns Array of default folders
   */
  async getDefaultFolders(userId: string): Promise<BookmarkFolder[]> {
    // Use repository directly for multiple results with custom ordering
    return await this.folderRepository.find({
      where: {
        userId,
        isDefault: true,
      },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Create default folders for user if they don't exist
   * @param userId - User ID
   */
  async createDefaultFolders(userId: string): Promise<void> {
    const defaultFolders = [
      {
        name: 'Favorites',
        description: 'Your favorite bookmarks',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
        isDefault: true,
        sortOrder: 0,
        color: '#FFD700',
        icon: 'star',
      },
      {
        name: 'Read Later',
        description: 'Bookmarks to read later',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
        isDefault: true,
        sortOrder: 1,
        color: '#FF6B6B',
        icon: 'clock',
      },
      {
        name: 'Archived',
        description: 'Archived bookmarks',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
        isDefault: true,
        sortOrder: 2,
        color: '#95A5A6',
        icon: 'archive',
      },
    ];

    for (const folderData of defaultFolders) {
      const existingFolder = await this.findOne({
        userId,
        name: folderData.name,
      });

      if (!existingFolder) {
        await this.create({
          ...folderData,
          userId,
        });
      }
    }
  }
}
