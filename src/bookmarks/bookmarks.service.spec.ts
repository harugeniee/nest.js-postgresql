import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from './entities/bookmark.entity';
import { BookmarkFolder } from './entities/bookmark-folder.entity';
import { CreateBookmarkDto, CreateBookmarkFolderDto } from './dto';
import { BOOKMARK_CONSTANTS } from 'src/shared/constants';

describe('BookmarksService', () => {
  let service: BookmarksService;

  const mockBookmark: Bookmark = {
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
  };

  const mockFolder: BookmarkFolder = {
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
  };

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

    it('should throw BadRequestException if bookmark already exists', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
      };

      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      await expect(
        service.createBookmark('1234567890123456789', createBookmarkDto),
      ).rejects.toThrow('Bookmark already exists');
    });

    it('should throw NotFoundException if folder not found', async () => {
      const createBookmarkDto: CreateBookmarkDto = {
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        bookmarkableId: '9876543210987654321',
        folderId: '9999999999999999999',
      };

      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockFolderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createBookmark('1234567890123456789', createBookmarkDto),
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('createFolder', () => {
    it('should create a new folder successfully', async () => {
      const createFolderDto: CreateBookmarkFolderDto = {
        name: 'Test Folder',
        description: 'Test folder description',
        type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
        visibility: BOOKMARK_CONSTANTS.FOLDER_VISIBILITY.PRIVATE,
      };

      mockFolderRepository.create.mockReturnValue(mockFolder);
      mockFolderRepository.save.mockResolvedValue(mockFolder);

      const result = await service.createFolder(
        '1234567890123456789',
        createFolderDto,
      );

      expect(result).toEqual(mockFolder);
      expect(mockFolderRepository.create).toHaveBeenCalledWith({
        ...createFolderDto,
        userId: '1234567890123456789',
      });
      expect(mockFolderRepository.save).toHaveBeenCalledWith(mockFolder);
    });
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks with pagination', async () => {
      const query = {
        page: 1,
        limit: 20,
        bookmarkableType: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockBookmark], 1]),
      };

      mockBookmarkRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getUserBookmarks(
        '1234567890123456789',
        query,
      );

      expect(result).toEqual({
        data: [mockBookmark],
        total: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'bookmark.userId = :userId',
        {
          userId: '1234567890123456789',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bookmark.bookmarkableType = :type',
        {
          type: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE,
        },
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

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockFolder], 1]),
      };

      mockFolderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUserFolders('1234567890123456789', query);

      expect(result).toEqual({
        data: [mockFolder],
        total: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'folder.userId = :userId',
        {
          userId: '1234567890123456789',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'folder.type = :type',
        {
          type: BOOKMARK_CONSTANTS.FOLDER_TYPES.CUSTOM,
        },
      );
    });
  });

  describe('getBookmarkStats', () => {
    it('should return bookmark statistics', async () => {
      // Mock stats data

      // Mock all the count queries
      mockBookmarkRepository.count
        .mockResolvedValueOnce(10) // totalBookmarks
        .mockResolvedValueOnce(8) // activeBookmarks
        .mockResolvedValueOnce(2) // archivedBookmarks
        .mockResolvedValueOnce(3) // favoriteBookmarks
        .mockResolvedValueOnce(5); // readLaterBookmarks

      mockFolderRepository.count.mockResolvedValue(3); // totalFolders

      // Mock the query builders for complex queries
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            // bookmarksByType
            { type: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.ARTICLE, count: '5' },
            { type: BOOKMARK_CONSTANTS.BOOKMARKABLE_TYPES.COMMENT, count: '3' },
          ])
          .mockResolvedValueOnce([
            // topTags
            { tag: 'test', count: '5' },
            { tag: 'bookmark', count: '3' },
          ])
          .mockResolvedValueOnce([
            // foldersWithCounts
            { folderId: '111', folderName: 'Test Folder', bookmarkCount: '5' },
          ]),
      };

      mockBookmarkRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockFolderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getBookmarkStats('1234567890123456789');

      expect(result.totalBookmarks).toBe(10);
      expect(result.activeBookmarks).toBe(8);
      expect(result.archivedBookmarks).toBe(2);
      expect(result.favoriteBookmarks).toBe(3);
      expect(result.readLaterBookmarks).toBe(5);
      expect(result.totalFolders).toBe(3);
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
  });
});
