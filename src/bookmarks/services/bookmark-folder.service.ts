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
import { IPagination } from 'src/common/interface/pagination.interface';

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
  ): Promise<IPagination<BookmarkFolder>> {
    const { page = 1, limit = 20, ...filters } = query;

    const where: Record<string, unknown> = {
      userId,
      ...filters,
    };

    // Use BaseService listOffset method with custom ordering
    const result = await this.listOffset(
      { page, limit, ...filters, sortBy: 'createdAt', order: 'DESC' },
      where,
      {
        relations: ['bookmarks'],
      },
    );

    // Apply custom ordering after getting results
    result.result.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
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
  async getAllFolders(
    query: Record<string, unknown>,
  ): Promise<IPagination<BookmarkFolder>> {
    const {
      page = 1,
      limit = 20,
      ...filters
    } = query as {
      page?: number;
      limit?: number;
      [key: string]: unknown;
    };

    // Use BaseService listOffset method
    const result = await this.listOffset(
      { page, limit, sortBy: 'createdAt', order: 'DESC' },
      filters,
      {
        relations: ['user', 'bookmarks'],
      },
    );

    return result;
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
    // Use BaseService to get all folders with relations
    const folders = await this.getUserFoldersWithRelations(userId);

    // Calculate statistics using helper methods
    const stats = this.calculateFolderStatistics(folders);

    return stats;
  }

  /**
   * Get quick folder statistics (lightweight version)
   * @param userId - User ID
   * @returns Basic folder statistics
   */
  async getQuickFolderStats(userId: string): Promise<{
    totalFolders: number;
    customFolders: number;
    systemFolders: number;
  }> {
    // Use BaseService findOne with count for better performance
    const [totalFolders, customFolders, systemFolders] = await Promise.all([
      this.folderRepository.count({ where: { userId } }),
      this.folderRepository.count({
        where: { userId, type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM },
      }),
      this.folderRepository.count({
        where: { userId, type: BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM },
      }),
    ]);

    return {
      totalFolders,
      customFolders,
      systemFolders,
    };
  }

  /**
   * Get user folders with relations for statistics
   * @param userId - User ID
   * @returns Array of folders with relations
   */
  private async getUserFoldersWithRelations(
    userId: string,
  ): Promise<BookmarkFolder[]> {
    // Use repository directly for custom ordering and relations
    return await this.folderRepository.find({
      where: { userId },
      relations: ['bookmarks'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Calculate folder statistics from folder array
   * @param folders - Array of folders with relations
   * @returns Calculated statistics
   */
  private calculateFolderStatistics(folders: BookmarkFolder[]): {
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
  } {
    const totalFolders = folders.length;

    // Use helper methods for counting
    const customFolders = this.countFoldersByType(
      folders,
      BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
    );
    const systemFolders = this.countFoldersByType(
      folders,
      BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
    );
    const publicFolders = this.countFoldersByVisibility(
      folders,
      BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC,
    );
    const privateFolders = this.countFoldersByVisibility(
      folders,
      BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
    );

    const foldersWithCounts = this.calculateFoldersWithCounts(folders);

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
   * Count folders by type
   * @param folders - Array of folders
   * @param type - Folder type to count
   * @returns Count of folders with specified type
   */
  private countFoldersByType(folders: BookmarkFolder[], type: string): number {
    return folders.filter((folder) => folder.type === type).length;
  }

  /**
   * Count folders by visibility
   * @param folders - Array of folders
   * @param visibility - Folder visibility to count
   * @returns Count of folders with specified visibility
   */
  private countFoldersByVisibility(
    folders: BookmarkFolder[],
    visibility: string,
  ): number {
    return folders.filter((folder) => folder.visibility === visibility).length;
  }

  /**
   * Calculate folders with bookmark counts
   * @param folders - Array of folders with relations
   * @returns Array of folders with counts
   */
  private calculateFoldersWithCounts(folders: BookmarkFolder[]): Array<{
    folderId: string;
    folderName: string;
    bookmarkCount: number;
  }> {
    return folders.map((folder) => ({
      folderId: folder.id,
      folderName: folder.name,
      bookmarkCount: this.countActiveBookmarks(folder.bookmarks || []),
    }));
  }

  /**
   * Count active bookmarks in a folder
   * @param bookmarks - Array of bookmarks
   * @returns Count of active bookmarks
   */
  private countActiveBookmarks(bookmarks: any[]): number {
    return bookmarks.filter(
      (bookmark: any) =>
        (bookmark as { status?: string })?.status ===
        BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
    ).length;
  }

  /**
   * Get folder statistics by criteria (generic method for reusability)
   * @param userId - User ID
   * @param criteria - Optional criteria for filtering
   * @returns Folder statistics based on criteria
   */
  async getFolderStatsByCriteria(
    userId: string,
    criteria?: {
      type?: string;
      visibility?: string;
      includeBookmarkCounts?: boolean;
    },
  ): Promise<{
    totalFolders: number;
    filteredFolders: number;
    foldersWithCounts?: Array<{
      folderId: string;
      folderName: string;
      bookmarkCount: number;
    }>;
  }> {
    const folders = await this.getUserFoldersWithRelations(userId);

    let filteredFolders = folders;

    // Apply filters if criteria provided
    if (criteria?.type) {
      filteredFolders = filteredFolders.filter(
        (folder) => folder.type === criteria.type,
      );
    }

    if (criteria?.visibility) {
      filteredFolders = filteredFolders.filter(
        (folder) => folder.visibility === criteria.visibility,
      );
    }

    const result: {
      totalFolders: number;
      filteredFolders: number;
      foldersWithCounts?: Array<{
        folderId: string;
        folderName: string;
        bookmarkCount: number;
      }>;
    } = {
      totalFolders: folders.length,
      filteredFolders: filteredFolders.length,
    };

    // Include bookmark counts if requested
    if (criteria?.includeBookmarkCounts) {
      result.foldersWithCounts =
        this.calculateFoldersWithCounts(filteredFolders);
    }

    return result;
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
    const where: Record<string, unknown> = { userId, name };
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
