import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkFolder } from './entities/bookmark-folder.entity';
import {
  CreateBookmarkDto,
  CreateBookmarkFolderDto,
  UpdateBookmarkDto,
  QueryBookmarksDto,
  QueryBookmarkFoldersDto,
} from './dto';
import { BOOKMARK_CONSTANTS } from 'src/shared/constants';
import { BookmarkFolderService } from './services';
import { CacheService } from 'src/shared/services';

describe('BookmarksService', () => {
  let service: BookmarksService;

  const mockBookmark = {
    id: '1234567890123456789',
    uuid: 'test-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    userId: '1234567890123456789',
    user: {} as any,
    bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
    bookmarkableId: '9876543210987654321',
    folderId: '1111111111111111111',
    folder: {} as any,
    status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
    note: 'Test bookmark',
    tags: 'test, bookmark',
    isFavorite: false,
    isReadLater: false,
    sortOrder: 0,
    metadata: {},
    isActive: () => true,
    isArchived: () => false,
    isDeleted: () => false,
    getTagsArray: () => ['test', 'bookmark'],
    setTagsArray: () => {},
    addTag: () => {},
    removeTag: () => {},
    hasTag: () => false,
    getSummary: () => ({}) as any,
  } as any;

  const mockFolder = {
    id: '1111111111111111111',
    uuid: 'folder-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    userId: '1234567890123456789',
    user: {} as any,
    name: 'Test Folder',
    description: 'Test folder description',
    type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
    visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
    isDefault: false,
    sortOrder: 0,
    color: '#FF5733',
    icon: 'star',
    metadata: {},
    bookmarks: [],
    isSystemFolder: () => false,
    canBeDeleted: () => true,
    isVisibleTo: () => true,
    getDisplayName: () => 'Test Folder',
    getStats: () => ({ totalBookmarks: 0, activeBookmarks: 0 }),
  } as any;

  const mockBookmarkRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockFolderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockBookmarkFolderService = {
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    getUserFolders: jest.fn(),
    getFolderById: jest.fn(),
    getAllFolders: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        {
          provide: getRepositoryToken(Bookmark),
          useValue: mockBookmarkRepository,
        },
        {
          provide: getRepositoryToken(BookmarkFolder),
          useValue: mockFolderRepository,
        },
        {
          provide: BookmarkFolderService,
          useValue: mockBookmarkFolderService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBookmark', () => {
    it('should create a new bookmark successfully', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
        note: 'Test bookmark',
        tags: ['test', 'bookmark'],
        isFavorite: false,
        isReadLater: false,
      };

      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockBookmarkRepository.create.mockReturnValue(mockBookmark);
      mockBookmarkRepository.save.mockResolvedValue(mockBookmark);

      const result = await service.createBookmark(
        '1234567890123456789',
        createBookmarkDto,
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarkRepository.create).toHaveBeenCalledWith({
        ...createBookmarkDto,
        userId: '1234567890123456789',
        tags: 'test, bookmark',
      });
      expect(mockBookmarkRepository.save).toHaveBeenCalledWith(mockBookmark);
    });

    it('should create bookmark with folder assignment', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT,
        bookmarkableId: '9876543210987654321',
        folderId: '1111111111111111111',
        note: 'Bookmark in folder',
        tags: ['comment', 'important'],
        isFavorite: true,
      };

      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockBookmarkFolderService.findOne.mockResolvedValue(mockFolder);
      mockBookmarkRepository.create.mockReturnValue(mockBookmark);
      mockBookmarkRepository.save.mockResolvedValue(mockBookmark);

      const result = await service.createBookmark(
        '1234567890123456789',
        createBookmarkDto,
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarkFolderService.findOne).toHaveBeenCalledWith({
        id: '1111111111111111111',
        userId: '1234567890123456789',
      });
    });

    it('should create bookmark with minimal data', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.MEDIA,
        bookmarkableId: '9876543210987654321',
      };

      const minimalBookmark = {
        ...mockBookmark,
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.MEDIA,
      };
      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockBookmarkRepository.create.mockReturnValue(minimalBookmark);
      mockBookmarkRepository.save.mockResolvedValue(minimalBookmark);

      const result = await service.createBookmark(
        '1234567890123456789',
        createBookmarkDto,
      );

      expect(result).toEqual(minimalBookmark);
      expect(mockBookmarkRepository.create).toHaveBeenCalledWith({
        ...createBookmarkDto,
        userId: '1234567890123456789',
        tags: undefined,
      });
    });

    it('should throw BadRequestException if bookmark already exists', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
      };

      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      await expect(
        service.createBookmark('1234567890123456789', createBookmarkDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException if folder not found', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
        folderId: '9999999999999999999',
      };

      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockBookmarkFolderService.findOne.mockResolvedValue(null);

      await expect(
        service.createBookmark('1234567890123456789', createBookmarkDto),
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors when creating bookmark', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.findOne.mockRejectedValue(error);

      await expect(
        service.createBookmark('1234567890123456789', createBookmarkDto),
      ).rejects.toThrow(error);
    });
  });

  describe('createFolder', () => {
    it('should create a new folder successfully', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Test Folder',
        description: 'Test folder description',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
        color: '#FF5733',
        icon: 'star',
      };

      mockBookmarkFolderService.createFolder.mockResolvedValue(mockFolder);

      const result = await service.createFolder(
        '1234567890123456789',
        createFolderDto,
      );

      expect(result).toEqual(mockFolder);
      expect(mockBookmarkFolderService.createFolder).toHaveBeenCalledWith(
        '1234567890123456789',
        createFolderDto,
      );
    });

    it('should create folder with minimal data', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Simple Folder',
      };

      const simpleFolder = { ...mockFolder, name: 'Simple Folder' };
      mockBookmarkFolderService.createFolder.mockResolvedValue(simpleFolder);

      const result = await service.createFolder(
        '1234567890123456789',
        createFolderDto,
      );

      expect(result).toEqual(simpleFolder);
      expect(mockBookmarkFolderService.createFolder).toHaveBeenCalledWith(
        '1234567890123456789',
        createFolderDto,
      );
    });

    it('should handle service errors when creating folder', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Test Folder',
      };

      const error = new HttpException(
        'Folder name already exists',
        HttpStatus.CONFLICT,
      );
      mockBookmarkFolderService.createFolder.mockRejectedValue(error);

      await expect(
        service.createFolder('1234567890123456789', createFolderDto),
      ).rejects.toThrow(error);
    });
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks with pagination and filters', async () => {
      const query: QueryBookmarksDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        folderId: '1111111111111111111',
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        isFavorite: true,
        search: 'test',
      };

      // Mock the BaseService listOffset method
      jest.spyOn(service as any, 'listOffset').mockResolvedValue({
        data: [mockBookmark],
        total: 1,
      });

      const result = await service.getUserBookmarks(
        '1234567890123456789',
        query,
      );

      expect(result).toEqual({
        data: [mockBookmark],
        total: 1,
      });
      expect((service as any).listOffset).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          userId: '1234567890123456789',
        }),
        expect.objectContaining({
          relations: ['folder'],
        }),
      );
    });

    it('should return empty result when no bookmarks found', async () => {
      const query: QueryBookmarksDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED,
      };

      jest.spyOn(service as any, 'listOffset').mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.getUserBookmarks(
        '1234567890123456789',
        query,
      );

      expect(result).toEqual({
        data: [],
        total: 0,
      });
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors when getting user bookmarks', async () => {
      const query: QueryBookmarksDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      jest.spyOn(service as any, 'listOffset').mockRejectedValue(error);

      await expect(
        service.getUserBookmarks('1234567890123456789', query),
      ).rejects.toThrow(error);
    });
  });

  describe('getUserFolders', () => {
    it('should return user folders with pagination and filters', async () => {
      const query: QueryBookmarkFoldersDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
        isDefault: false,
      };

      mockBookmarkFolderService.getUserFolders.mockResolvedValue({
        data: [mockFolder],
        total: 1,
      });

      const result = await service.getUserFolders('1234567890123456789', query);

      expect(result).toEqual({
        data: [mockFolder],
        total: 1,
      });
      expect(mockBookmarkFolderService.getUserFolders).toHaveBeenCalledWith(
        '1234567890123456789',
        query,
      );
    });

    it('should return empty result when no folders found', async () => {
      const query: QueryBookmarkFoldersDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.SYSTEM,
      };

      mockBookmarkFolderService.getUserFolders.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.getUserFolders('1234567890123456789', query);

      expect(result).toEqual({
        data: [],
        total: 0,
      });
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors when getting user folders', async () => {
      const query: QueryBookmarkFoldersDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkFolderService.getUserFolders.mockRejectedValue(error);

      await expect(
        service.getUserFolders('1234567890123456789', query),
      ).rejects.toThrow(error);
    });
  });

  describe('getBookmarkStats', () => {
    it('should return comprehensive bookmark statistics', async () => {
      // Mock all the count queries
      mockBookmarkRepository.count
        .mockResolvedValueOnce(10) // totalBookmarks
        .mockResolvedValueOnce(8) // activeBookmarks
        .mockResolvedValueOnce(2) // archivedBookmarks
        .mockResolvedValueOnce(3) // favoriteBookmarks
        .mockResolvedValueOnce(5); // readLaterBookmarks

      mockFolderRepository.count.mockResolvedValue(3); // totalFolders

      // Mock find queries for complex statistics
      mockBookmarkRepository.find
        .mockResolvedValueOnce([
          { bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE },
          { bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE },
          { bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT },
        ])
        .mockResolvedValueOnce([
          { tags: 'test, bookmark' },
          { tags: 'test, important' },
          { tags: 'bookmark, research' },
        ]);

      mockFolderRepository.find.mockResolvedValue([
        {
          id: '111',
          name: 'Test Folder',
          bookmarks: [
            { status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE },
            { status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE },
          ],
        },
      ]);

      const result = await service.getBookmarkStats('1234567890123456789');

      expect(result.totalBookmarks).toBe(10);
      expect(result.activeBookmarks).toBe(8);
      expect(result.archivedBookmarks).toBe(2);
      expect(result.favoriteBookmarks).toBe(3);
      expect(result.readLaterBookmarks).toBe(5);
      expect(result.totalFolders).toBe(3);
      expect(result.bookmarksByType).toBeDefined();
      expect(result.topTags).toBeDefined();
      expect(result.foldersWithCounts).toBeDefined();
    });

    it('should return empty statistics for new user', async () => {
      mockBookmarkRepository.count.mockResolvedValue(0);
      mockFolderRepository.count.mockResolvedValue(0);
      mockBookmarkRepository.find.mockResolvedValue([]);
      mockFolderRepository.find.mockResolvedValue([]);

      const result = await service.getBookmarkStats('1234567890123456789');

      expect(result.totalBookmarks).toBe(0);
      expect(result.activeBookmarks).toBe(0);
      expect(result.archivedBookmarks).toBe(0);
      expect(result.favoriteBookmarks).toBe(0);
      expect(result.readLaterBookmarks).toBe(0);
      expect(result.totalFolders).toBe(0);
      expect(result.bookmarksByType).toEqual({});
      expect(result.topTags).toEqual([]);
      expect(result.foldersWithCounts).toEqual([]);
    });

    it('should handle service errors when getting bookmark stats', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.count.mockRejectedValue(error);

      await expect(
        service.getBookmarkStats('1234567890123456789'),
      ).rejects.toThrow(error);
    });
  });

  describe('isBookmarked', () => {
    it('should return true if content is bookmarked', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      const result = await service.isBookmarked(
        '1234567890123456789',
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toBe(true);
      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: '1234567890123456789',
          bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
          bookmarkableId: '9876543210987654321',
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        },
      });
    });

    it('should return false if content is not bookmarked', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      const result = await service.isBookmarked(
        '1234567890123456789',
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toBe(false);
    });

    it('should check bookmark for different content types', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      const result = await service.isBookmarked(
        '1234567890123456789',
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT,
        '9876543210987654321',
      );

      expect(result).toBe(true);
      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: '1234567890123456789',
          bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT,
          bookmarkableId: '9876543210987654321',
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        },
      });
    });

    it('should handle service errors when checking bookmark', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.findOne.mockRejectedValue(error);

      await expect(
        service.isBookmarked(
          '1234567890123456789',
          BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
          '9876543210987654321',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('updateBookmark', () => {
    it('should update a bookmark successfully', async () => {
      const updateBookmarkDto: UpdateBookmarkDto = {
        note: 'Updated bookmark note',
        isFavorite: true,
        tags: ['updated', 'important'],
      };

      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockBookmarkRepository.save.mockResolvedValue({
        ...mockBookmark,
        ...updateBookmarkDto,
      });

      const result = await service.updateBookmark(
        '1234567890123456789',
        '1234567890123456789',
        updateBookmarkDto,
      );

      expect(result).toBeDefined();
      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1234567890123456789', userId: '1234567890123456789' },
      });
      expect(mockBookmarkRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bookmark not found', async () => {
      const updateBookmarkDto: UpdateBookmarkDto = {
        note: 'Updated note',
      };

      mockBookmarkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateBookmark(
          '1234567890123456789',
          '1234567890123456789',
          updateBookmarkDto,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors when updating bookmark', async () => {
      const updateBookmarkDto: UpdateBookmarkDto = {
        note: 'Updated note',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.findOne.mockRejectedValue(error);

      await expect(
        service.updateBookmark(
          '1234567890123456789',
          '1234567890123456789',
          updateBookmarkDto,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('removeBookmark', () => {
    it('should remove a bookmark successfully', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockBookmarkRepository.update.mockResolvedValue({ affected: 1 });

      await service.removeBookmark(
        '1234567890123456789',
        '1234567890123456789',
      );

      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1234567890123456789', userId: '1234567890123456789' },
      });
      expect(mockBookmarkRepository.update).toHaveBeenCalledWith(
        '1234567890123456789',
        {
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.DELETED,
        },
      );
    });

    it('should throw NotFoundException if bookmark not found', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeBookmark('1234567890123456789', '1234567890123456789'),
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors when removing bookmark', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.findOne.mockRejectedValue(error);

      await expect(
        service.removeBookmark('1234567890123456789', '1234567890123456789'),
      ).rejects.toThrow(error);
    });
  });

  describe('getBookmarkForContent', () => {
    it('should return bookmark for specific content', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      const result = await service.getBookmarkForContent(
        '1234567890123456789',
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: '1234567890123456789',
          bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
          bookmarkableId: '9876543210987654321',
          status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ACTIVE,
        },
        relations: ['folder'],
      });
    });

    it('should return null if bookmark not found', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      const result = await service.getBookmarkForContent(
        '1234567890123456789',
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toBeNull();
    });

    it('should handle service errors when getting bookmark for content', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkRepository.findOne.mockRejectedValue(error);

      await expect(
        service.getBookmarkForContent(
          '1234567890123456789',
          BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
          '9876543210987654321',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('getFolderById', () => {
    it('should return folder by ID', async () => {
      mockBookmarkFolderService.getFolderById.mockResolvedValue(mockFolder);

      const result = await service.getFolderById(
        '1111111111111111111',
        '1234567890123456789',
      );

      expect(result).toEqual(mockFolder);
      expect(mockBookmarkFolderService.getFolderById).toHaveBeenCalledWith(
        '1111111111111111111',
        '1234567890123456789',
      );
    });

    it('should handle service errors when getting folder by ID', async () => {
      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarkFolderService.getFolderById.mockRejectedValue(error);

      await expect(
        service.getFolderById('1111111111111111111', '1234567890123456789'),
      ).rejects.toThrow(error);
    });
  });

  describe('updateFolder', () => {
    it('should update a folder successfully', async () => {
      const updateFolderDto = {
        name: 'Updated Folder Name',
        description: 'Updated description',
      };

      mockBookmarkFolderService.updateFolder.mockResolvedValue({
        ...mockFolder,
        ...updateFolderDto,
      });

      const result = await service.updateFolder(
        '1111111111111111111',
        '1234567890123456789',
        updateFolderDto,
      );

      expect(result).toBeDefined();
      expect(mockBookmarkFolderService.updateFolder).toHaveBeenCalledWith(
        '1111111111111111111',
        '1234567890123456789',
        updateFolderDto,
      );
    });

    it('should handle service errors when updating folder', async () => {
      const updateFolderDto = {
        name: 'Updated Name',
      };

      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarkFolderService.updateFolder.mockRejectedValue(error);

      await expect(
        service.updateFolder(
          '1111111111111111111',
          '1234567890123456789',
          updateFolderDto,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder successfully', async () => {
      mockBookmarkFolderService.deleteFolder.mockResolvedValue(undefined);

      await service.deleteFolder('1111111111111111111', '1234567890123456789');

      expect(mockBookmarkFolderService.deleteFolder).toHaveBeenCalledWith(
        '1111111111111111111',
        '1234567890123456789',
      );
    });

    it('should handle service errors when deleting folder', async () => {
      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarkFolderService.deleteFolder.mockRejectedValue(error);

      await expect(
        service.deleteFolder('1111111111111111111', '1234567890123456789'),
      ).rejects.toThrow(error);
    });
  });

  describe('list (admin)', () => {
    it('should return all bookmarks for admin', async () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      jest.spyOn(service as any, 'listOffset').mockResolvedValue({
        data: [mockBookmark],
        total: 1,
      });

      const result = await service.list(query);

      expect(result).toEqual({
        data: [mockBookmark],
        total: 1,
      });
      expect((service as any).listOffset).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          relations: ['user', 'folder'],
        }),
      );
    });

    it('should handle service errors when listing all bookmarks', async () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      jest.spyOn(service as any, 'listOffset').mockRejectedValue(error);

      await expect(service.list(query)).rejects.toThrow(error);
    });
  });

  describe('getAllFolders (admin)', () => {
    it('should return all folders for admin', async () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      mockBookmarkFolderService.getAllFolders.mockResolvedValue({
        data: [mockFolder],
        total: 1,
      });

      const result = await service.getAllFolders(query);

      expect(result).toEqual({
        data: [mockFolder],
        total: 1,
      });
      expect(mockBookmarkFolderService.getAllFolders).toHaveBeenCalledWith(
        query,
      );
    });

    it('should handle service errors when getting all folders', async () => {
      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarkFolderService.getAllFolders.mockRejectedValue(error);

      await expect(service.getAllFolders(query)).rejects.toThrow(error);
    });
  });
});
