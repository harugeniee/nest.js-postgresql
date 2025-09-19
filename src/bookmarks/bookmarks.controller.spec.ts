import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import {
  CreateBookmarkDto,
  CreateBookmarkFolderDto,
  UpdateBookmarkDto,
  UpdateBookmarkFolderDto,
  QueryBookmarksDto,
  QueryBookmarkFoldersDto,
} from './dto';
import { BOOKMARK_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

describe('BookmarksController', () => {
  let controller: BookmarksController;

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
  };

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
  };

  const mockRequest = {
    user: {
      uid: '1234567890123456789',
    },
  } as any;

  const mockBookmarksService = {
    createBookmark: jest.fn(),
    updateBookmark: jest.fn(),
    removeBookmark: jest.fn(),
    getUserBookmarks: jest.fn(),
    findOne: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    getUserFolders: jest.fn(),
    getBookmarkStats: jest.fn(),
    isBookmarked: jest.fn(),
    getBookmarkForContent: jest.fn(),
    getFolderById: jest.fn(),
    list: jest.fn(),
    getAllFolders: jest.fn(),
    findAll: jest.fn(),
    folderRepository: {
      findAndCount: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        {
          provide: BookmarksService,
          useValue: mockBookmarksService,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BookmarksController>(BookmarksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      mockBookmarksService.createBookmark.mockResolvedValue(mockBookmark);

      const result = await controller.createBookmark(
        mockRequest,
        createBookmarkDto,
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarksService.createBookmark).toHaveBeenCalledWith(
        mockRequest.user.uid,
        createBookmarkDto,
      );
    });

    it('should create bookmark with folder assignment', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT,
        bookmarkableId: '9876543210987654321',
        folderId: '1111111111111111111',
        note: 'Bookmark in folder',
        tags: ['comment', 'important'],
        isFavorite: true,
        isReadLater: false,
      };

      const bookmarkWithFolder = {
        ...mockBookmark,
        folderId: '1111111111111111111',
      };
      mockBookmarksService.createBookmark.mockResolvedValue(bookmarkWithFolder);

      const result = await controller.createBookmark(
        mockRequest,
        createBookmarkDto,
      );

      expect(result).toEqual(bookmarkWithFolder);
      expect(mockBookmarksService.createBookmark).toHaveBeenCalledWith(
        mockRequest.user.uid,
        createBookmarkDto,
      );
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
      mockBookmarksService.createBookmark.mockResolvedValue(minimalBookmark);

      const result = await controller.createBookmark(
        mockRequest,
        createBookmarkDto,
      );

      expect(result).toEqual(minimalBookmark);
      expect(mockBookmarksService.createBookmark).toHaveBeenCalledWith(
        mockRequest.user.uid,
        createBookmarkDto,
      );
    });

    it('should handle service errors when creating bookmark', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
      };

      const error = new HttpException(
        'Duplicate bookmark',
        HttpStatus.CONFLICT,
      );
      mockBookmarksService.createBookmark.mockRejectedValue(error);

      await expect(
        controller.createBookmark(mockRequest, createBookmarkDto),
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

      const expectedResult = {
        result: [mockBookmark],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      mockBookmarksService.getUserBookmarks.mockResolvedValue({
        result: [mockBookmark],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      const result = await controller.getUserBookmarks(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.getUserBookmarks).toHaveBeenCalledWith(
        mockRequest.user.uid,
        query,
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

      const expectedResult = {
        result: [],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 0,
          totalPages: 0,
        },
      };

      mockBookmarksService.getUserBookmarks.mockResolvedValue({
        result: [],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 0,
          totalPages: 0,
        },
      });

      const result = await controller.getUserBookmarks(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(result.result).toHaveLength(0);
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
      mockBookmarksService.getUserBookmarks.mockRejectedValue(error);

      await expect(
        controller.getUserBookmarks(mockRequest, query),
      ).rejects.toThrow(error);
    });
  });

  describe('getBookmark', () => {
    it('should return a specific bookmark with relations', async () => {
      mockBookmarksService.findOne.mockResolvedValue(mockBookmark);

      const result = await controller.getBookmark(
        mockRequest,
        '1234567890123456789',
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarksService.findOne).toHaveBeenCalledWith(
        { id: '1234567890123456789' },
        {
          relations: ['folder'],
        },
      );
    });

    it('should return null when bookmark not found', async () => {
      mockBookmarksService.findOne.mockResolvedValue(null);

      const result = await controller.getBookmark(mockRequest, 'nonexistent');

      expect(result).toBeNull();
      expect(mockBookmarksService.findOne).toHaveBeenCalledWith(
        { id: 'nonexistent' },
        {
          relations: ['folder'],
        },
      );
    });

    it('should handle service errors when getting bookmark', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarksService.findOne.mockRejectedValue(error);

      await expect(
        controller.getBookmark(mockRequest, '1234567890123456789'),
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

      const updatedBookmark = { ...mockBookmark, ...updateBookmarkDto };

      mockBookmarksService.updateBookmark.mockResolvedValue(updatedBookmark);

      const result = await controller.updateBookmark(
        mockRequest,
        '1234567890123456789',
        updateBookmarkDto,
      );

      expect(result).toEqual(updatedBookmark);
      expect(mockBookmarksService.updateBookmark).toHaveBeenCalledWith(
        '1234567890123456789',
        mockRequest.user.uid,
        updateBookmarkDto,
      );
    });

    it('should update bookmark status', async () => {
      const updateBookmarkDto: UpdateBookmarkDto = {
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED,
      };

      const archivedBookmark = {
        ...mockBookmark,
        status: BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED,
      };
      mockBookmarksService.updateBookmark.mockResolvedValue(archivedBookmark);

      const result = await controller.updateBookmark(
        mockRequest,
        '1234567890123456789',
        updateBookmarkDto,
      );

      expect(result).toEqual(archivedBookmark);
      expect(result.status).toBe(BOOKMARK_CONSTANTS.BOOKMARK_STATUS.ARCHIVED);
    });

    it('should handle service errors when updating bookmark', async () => {
      const updateBookmarkDto: UpdateBookmarkDto = {
        note: 'Updated note',
      };

      const error = new HttpException(
        'Bookmark not found',
        HttpStatus.NOT_FOUND,
      );
      mockBookmarksService.updateBookmark.mockRejectedValue(error);

      await expect(
        controller.updateBookmark(
          mockRequest,
          '1234567890123456789',
          updateBookmarkDto,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('removeBookmark', () => {
    it('should remove a bookmark successfully', async () => {
      mockBookmarksService.removeBookmark.mockResolvedValue(undefined);

      await controller.removeBookmark(mockRequest, '1234567890123456789');

      expect(mockBookmarksService.removeBookmark).toHaveBeenCalledWith(
        '1234567890123456789',
        mockRequest.user.uid,
      );
    });

    it('should handle service errors when removing bookmark', async () => {
      const error = new HttpException(
        'Bookmark not found',
        HttpStatus.NOT_FOUND,
      );
      mockBookmarksService.removeBookmark.mockRejectedValue(error);

      await expect(
        controller.removeBookmark(mockRequest, '1234567890123456789'),
      ).rejects.toThrow(error);
    });
  });

  describe('getBookmarkStats', () => {
    it('should return comprehensive bookmark statistics', async () => {
      const mockStats = {
        totalBookmarks: 10,
        activeBookmarks: 8,
        archivedBookmarks: 2,
        favoriteBookmarks: 3,
        readLaterBookmarks: 5,
        totalFolders: 3,
        bookmarksByType: {
          [BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE]: 5,
          [BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT]: 3,
        },
        topTags: [
          { tag: 'test', count: 5 },
          { tag: 'bookmark', count: 3 },
        ],
        foldersWithCounts: [
          { folderId: '111', folderName: 'Test Folder', bookmarkCount: 5 },
        ],
      };

      mockBookmarksService.getBookmarkStats.mockResolvedValue(mockStats);

      const result = await controller.getBookmarkStats(mockRequest);

      expect(result).toEqual(mockStats);
      expect(mockBookmarksService.getBookmarkStats).toHaveBeenCalledWith(
        mockRequest.user.uid,
      );
    });

    it('should return empty statistics for new user', async () => {
      const emptyStats = {
        totalBookmarks: 0,
        activeBookmarks: 0,
        archivedBookmarks: 0,
        favoriteBookmarks: 0,
        readLaterBookmarks: 0,
        totalFolders: 0,
        bookmarksByType: {},
        topTags: [],
        foldersWithCounts: [],
      };

      mockBookmarksService.getBookmarkStats.mockResolvedValue(emptyStats);

      const result = await controller.getBookmarkStats(mockRequest);

      expect(result).toEqual(emptyStats);
      expect(result.totalBookmarks).toBe(0);
    });

    it('should handle service errors when getting bookmark stats', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarksService.getBookmarkStats.mockRejectedValue(error);

      await expect(controller.getBookmarkStats(mockRequest)).rejects.toThrow(
        error,
      );
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

      mockBookmarksService.createFolder.mockResolvedValue(mockFolder);

      const result = await controller.createFolder(
        mockRequest,
        createFolderDto,
      );

      expect(result).toEqual(mockFolder);
      expect(mockBookmarksService.createFolder).toHaveBeenCalledWith(
        mockRequest.user.uid,
        createFolderDto,
      );
    });

    it('should create folder with minimal data', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Simple Folder',
      };

      const simpleFolder = { ...mockFolder, name: 'Simple Folder' };
      mockBookmarksService.createFolder.mockResolvedValue(simpleFolder);

      const result = await controller.createFolder(
        mockRequest,
        createFolderDto,
      );

      expect(result).toEqual(simpleFolder);
      expect(mockBookmarksService.createFolder).toHaveBeenCalledWith(
        mockRequest.user.uid,
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
      mockBookmarksService.createFolder.mockRejectedValue(error);

      await expect(
        controller.createFolder(mockRequest, createFolderDto),
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

      const expectedResult = {
        result: [mockFolder],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      mockBookmarksService.getUserFolders.mockResolvedValue({
        result: [mockFolder],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      const result = await controller.getUserFolders(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.getUserFolders).toHaveBeenCalledWith(
        mockRequest.user.uid,
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

      const expectedResult = {
        result: [],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 0,
          totalPages: 0,
        },
      };

      mockBookmarksService.getUserFolders.mockResolvedValue({
        result: [],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 0,
          totalPages: 0,
        },
      });

      const result = await controller.getUserFolders(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(result.result).toHaveLength(0);
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
      mockBookmarksService.getUserFolders.mockRejectedValue(error);

      await expect(
        controller.getUserFolders(mockRequest, query),
      ).rejects.toThrow(error);
    });
  });

  describe('getFolder', () => {
    it('should return a specific folder with relations', async () => {
      mockBookmarksService.getFolderById = jest
        .fn()
        .mockResolvedValue(mockFolder);

      const result = await controller.getFolder(
        mockRequest,
        '1111111111111111111',
      );

      expect(result).toEqual(mockFolder);
      expect(mockBookmarksService.getFolderById).toHaveBeenCalledWith(
        '1111111111111111111',
        mockRequest.user.uid,
      );
    });

    it('should throw error when folder not found', async () => {
      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarksService.getFolderById = jest.fn().mockRejectedValue(error);

      await expect(
        controller.getFolder(mockRequest, 'nonexistent'),
      ).rejects.toThrow(error);
    });

    it('should handle service errors when getting folder', async () => {
      const error = new HttpException(
        'Database error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      mockBookmarksService.getFolderById = jest.fn().mockRejectedValue(error);

      await expect(
        controller.getFolder(mockRequest, '1111111111111111111'),
      ).rejects.toThrow(error);
    });
  });

  describe('updateFolder', () => {
    it('should update a folder successfully', async () => {
      const updateFolderDto: UpdateBookmarkFolderDto = {
        name: 'Updated Folder Name',
        description: 'Updated description',
        color: '#00FF00',
        icon: 'heart',
      };

      const updatedFolder = { ...mockFolder, ...updateFolderDto };

      mockBookmarksService.updateFolder.mockResolvedValue(updatedFolder);

      const result = await controller.updateFolder(
        mockRequest,
        '1111111111111111111',
        updateFolderDto,
      );

      expect(result).toEqual(updatedFolder);
      expect(mockBookmarksService.updateFolder).toHaveBeenCalledWith(
        '1111111111111111111',
        mockRequest.user.uid,
        updateFolderDto,
      );
    });

    it('should update folder visibility', async () => {
      const updateFolderDto: UpdateBookmarkFolderDto = {
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC,
      };

      const publicFolder = {
        ...mockFolder,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC,
      };
      mockBookmarksService.updateFolder.mockResolvedValue(publicFolder);

      const result = await controller.updateFolder(
        mockRequest,
        '1111111111111111111',
        updateFolderDto,
      );

      expect(result).toEqual(publicFolder);
      expect(result.visibility).toBe(
        BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PUBLIC,
      );
    });

    it('should handle service errors when updating folder', async () => {
      const updateFolderDto: UpdateBookmarkFolderDto = {
        name: 'Updated Name',
      };

      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarksService.updateFolder.mockRejectedValue(error);

      await expect(
        controller.updateFolder(
          mockRequest,
          '1111111111111111111',
          updateFolderDto,
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder successfully', async () => {
      mockBookmarksService.deleteFolder.mockResolvedValue(undefined);

      await controller.deleteFolder(mockRequest, '1111111111111111111');

      expect(mockBookmarksService.deleteFolder).toHaveBeenCalledWith(
        '1111111111111111111',
        mockRequest.user.uid,
      );
    });

    it('should handle service errors when deleting folder', async () => {
      const error = new HttpException('Folder not found', HttpStatus.NOT_FOUND);
      mockBookmarksService.deleteFolder.mockRejectedValue(error);

      await expect(
        controller.deleteFolder(mockRequest, '1111111111111111111'),
      ).rejects.toThrow(error);
    });

    it('should handle forbidden deletion of system folder', async () => {
      const error = new HttpException(
        'System folder cannot be deleted',
        HttpStatus.FORBIDDEN,
      );
      mockBookmarksService.deleteFolder.mockRejectedValue(error);

      await expect(
        controller.deleteFolder(mockRequest, '1111111111111111111'),
      ).rejects.toThrow(error);
    });
  });

  // Admin endpoints tests
  describe('getAllBookmarks (admin)', () => {
    it('should return all bookmarks for admin', async () => {
      const query: QueryBookmarksDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const expectedResult = {
        result: [mockBookmark],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      mockBookmarksService.list.mockResolvedValue({
        result: [mockBookmark],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      const result = await controller.getAllBookmarks(query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.list).toHaveBeenCalledWith(query);
    });

    it('should handle service errors when getting all bookmarks', async () => {
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
      mockBookmarksService.list.mockRejectedValue(error);

      await expect(controller.getAllBookmarks(query)).rejects.toThrow(error);
    });
  });

  describe('getAllFolders (admin)', () => {
    it('should return all folders for admin', async () => {
      const query: QueryBookmarkFoldersDto = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const expectedResult = {
        result: [mockFolder],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      mockBookmarksService.getAllFolders.mockResolvedValue({
        result: [mockFolder],
        metaData: {
          currentPage: 1,
          pageSize: 20,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      const result = await controller.getAllFolders(query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.getAllFolders).toHaveBeenCalledWith(query);
    });

    it('should handle service errors when getting all folders', async () => {
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
      mockBookmarksService.getAllFolders.mockRejectedValue(error);

      await expect(controller.getAllFolders(query)).rejects.toThrow(error);
    });
  });
});
