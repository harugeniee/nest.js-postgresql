import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto, CreateBookmarkFolderDto } from './dto';
import { BOOKMARK_CONSTANTS } from 'src/shared/constants';

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
  };

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
    it('should create a new bookmark', async () => {
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
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks with pagination', async () => {
      const query = {
        page: 1,
        limit: 20,
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
      };

      const expectedResult = {
        data: [mockBookmark],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockBookmarksService.getUserBookmarks.mockResolvedValue({
        data: [mockBookmark],
        total: 1,
      });

      const result = await controller.getUserBookmarks(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.getUserBookmarks).toHaveBeenCalledWith(
        mockRequest.user.uid,
        query,
      );
    });
  });

  describe('getBookmark', () => {
    it('should return a specific bookmark', async () => {
      mockBookmarksService.findOne.mockResolvedValue(mockBookmark);

      const result = await controller.getBookmark(
        mockRequest,
        '1234567890123456789',
      );

      expect(result).toEqual(mockBookmark);
      expect(mockBookmarksService.findOne).toHaveBeenCalledWith(
        '1234567890123456789',
        {
          where: { userId: mockRequest.user.uid },
          relations: ['folder'],
        },
      );
    });
  });

  describe('updateBookmark', () => {
    it('should update a bookmark', async () => {
      const updateBookmarkDto = {
        note: 'Updated bookmark note',
        isFavorite: true,
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
  });

  describe('removeBookmark', () => {
    it('should remove a bookmark', async () => {
      mockBookmarksService.removeBookmark.mockResolvedValue(undefined);

      await controller.removeBookmark(mockRequest, '1234567890123456789');

      expect(mockBookmarksService.removeBookmark).toHaveBeenCalledWith(
        '1234567890123456789',
        mockRequest.user.uid,
      );
    });
  });

  describe('checkBookmark', () => {
    it('should check if content is bookmarked', async () => {
      mockBookmarksService.isBookmarked.mockResolvedValue(true);
      mockBookmarksService.getBookmarkForContent.mockResolvedValue(
        mockBookmark,
      );

      const result = await controller.checkBookmark(
        mockRequest,
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toEqual({
        isBookmarked: true,
        bookmark: mockBookmark,
      });
      expect(mockBookmarksService.isBookmarked).toHaveBeenCalledWith(
        mockRequest.user.uid,
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );
    });

    it('should return false when content is not bookmarked', async () => {
      mockBookmarksService.isBookmarked.mockResolvedValue(false);

      const result = await controller.checkBookmark(
        mockRequest,
        BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        '9876543210987654321',
      );

      expect(result).toEqual({
        isBookmarked: false,
        bookmark: undefined,
      });
    });
  });

  describe('getBookmarkStats', () => {
    it('should return bookmark statistics', async () => {
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
  });

  describe('createFolder', () => {
    it('should create a new folder', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Test Folder',
        description: 'Test folder description',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
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
  });

  describe('getUserFolders', () => {
    it('should return user folders with pagination', async () => {
      const query = {
        page: 1,
        limit: 20,
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
      };

      const expectedResult = {
        data: [mockFolder],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockBookmarksService.getUserFolders.mockResolvedValue({
        data: [mockFolder],
        total: 1,
      });

      const result = await controller.getUserFolders(mockRequest, query);

      expect(result).toEqual(expectedResult);
      expect(mockBookmarksService.getUserFolders).toHaveBeenCalledWith(
        mockRequest.user.uid,
        query,
      );
    });
  });

  describe('getFolder', () => {
    it('should return a specific folder', async () => {
      mockBookmarksService.folderRepository.findAndCount.mockResolvedValue([
        mockFolder,
        1,
      ]);

      const result = await controller.getFolder(
        mockRequest,
        '1111111111111111111',
      );

      expect(result).toEqual(mockFolder);
    });
  });

  describe('updateFolder', () => {
    it('should update a folder', async () => {
      const updateFolderDto = {
        name: 'Updated Folder Name',
        description: 'Updated description',
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
  });

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      mockBookmarksService.deleteFolder.mockResolvedValue(undefined);

      await controller.deleteFolder(mockRequest, '1111111111111111111');

      expect(mockBookmarksService.deleteFolder).toHaveBeenCalledWith(
        '1111111111111111111',
        mockRequest.user.uid,
      );
    });
  });
});
