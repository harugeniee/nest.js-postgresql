import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MediaService } from 'src/media/media.service';
import { STICKER_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services/cache/cache.service';
import {
  AddStickerToPackDto,
  BatchPackItemsDto,
  CreateStickerDto,
  CreateStickerPackDto,
  QueryStickerPacksDto,
  QueryStickersDto,
  RemoveStickerFromPackDto,
  ReorderStickerPackItemsDto,
  UpdateStickerDto,
  UpdateStickerPackDto,
} from './dto';
import { StickerPackItem } from './entities/sticker-pack-item.entity';
import { StickerPack } from './entities/sticker-pack.entity';
import { Sticker } from './entities/sticker.entity';
import { StickersService } from './stickers.service';

describe('StickersService', () => {
  let service: StickersService;
  let stickerRepo: Repository<Sticker>;
  let stickerPackRepo: Repository<StickerPack>;
  let stickerPackItemRepo: Repository<StickerPackItem>;
  let mediaService: MediaService;
  let cacheService: CacheService;
  let configService: ConfigService;

  // Mock data
  const mockUser = {
    id: '1234567890123456789',
    uuid: 'test-user-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    dob: new Date('1990-01-01'),
    phoneNumber: '+1234567890',
    password: 'hashedpassword',
    oauthProvider: null,
    oauthId: null,
    firebaseUid: 'firebase-uid-123',
    photoUrl: 'https://example.com/photo.jpg',
    authMethod: 'email_password',
    isEmailVerified: true,
    isPhoneVerified: false,
    avatarId: null,
    avatar: null,
    ownedOrganizations: [],
    organizationMemberships: [],
    status: 'active',
    role: 'user',
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  const mockMedia = {
    id: '1234567890123456789',
    uuid: 'test-media-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    status: 'active',
    name: 'test-image.png',
    title: 'Test Image',
    altText: 'Test image alt text',
    path: 'media/test-image.png',
    mimeType: 'image/png',
    extension: 'png',
    size: 100000, // 100KB - within sticker limits
    description: 'Test image description',
    type: 'image',
    url: 'https://example.com/media/test-image.png',
    key: 'media/test-image.png',
    originalName: 'test-image.png',
    thumbnailUrl: 'https://example.com/thumbnails/test-image.png',
    previewUrl: 'https://example.com/previews/test-image.png',
    userId: '1234567890123456789',
    user: mockUser,
    metadata: '{}',
    storageProvider: 'r2',
    width: 320,
    height: 320,
    duration: 0,
    downloadCount: 0,
    viewCount: 0,
    isPublic: false,
    tags: '["test", "image"]',
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
    getDimensions: jest.fn().mockReturnValue('320x320'),
    getFormattedSize: jest.fn().mockReturnValue('1.0 MB'),
    isImage: jest.fn().mockReturnValue(true),
    isVideo: jest.fn().mockReturnValue(false),
    isAudio: jest.fn().mockReturnValue(false),
    isDocument: jest.fn().mockReturnValue(false),
  } as any;

  const createMockSticker = (overrides: Partial<Sticker> = {}): Sticker => {
    const baseSticker = {
      id: '1234567890123456789',
      uuid: 'test-sticker-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
      mediaId: '1234567890123456789',
      media: mockMedia,
      name: 'test-sticker',
      tags: 'test,cute',
      description: 'Test sticker',
      format: STICKER_CONSTANTS.FORMATS.PNG,
      available: true,
      status: STICKER_CONSTANTS.STATUS.APPROVED,
      width: 320,
      height: 320,
      durationMs: null,
      sortValue: 0,
      createdBy: '1234567890123456789',
      creator: mockUser,
      updatedBy: '1234567890123456789',
      updater: mockUser,
      getDimensions: jest.fn().mockReturnValue('320x320'),
      isAnimated: jest.fn().mockReturnValue(false),
      isUsable: jest.fn().mockReturnValue(true),
      getTagsArray: jest.fn().mockReturnValue(['test', 'cute']),
      setTagsArray: jest.fn(),
      generateId: jest.fn(),
      toJSON: jest.fn().mockReturnValue({}),
      isDeleted: jest.fn().mockReturnValue(false),
      getAge: jest.fn().mockReturnValue(1000000),
      getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
    };

    return { ...baseSticker, ...overrides } as Sticker;
  };

  const createMockStickerPack = (
    overrides: Partial<StickerPack> = {},
  ): StickerPack => {
    const basePack = {
      id: '1234567890123456789',
      uuid: 'test-pack-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
      name: 'Test Pack',
      slug: 'test-pack',
      description: 'Test sticker pack',
      isPublished: true,
      sortValue: 0,
      createdBy: '1234567890123456789',
      creator: mockUser,
      updatedBy: '1234567890123456789',
      updater: mockUser,
      items: [],
      getStickerCount: jest.fn().mockReturnValue(0),
      isVisible: jest.fn().mockReturnValue(true),
      getStatus: jest
        .fn()
        .mockReturnValue(STICKER_CONSTANTS.PACK_STATUS.PUBLISHED),
      generateId: jest.fn(),
      toJSON: jest.fn().mockReturnValue({}),
      isDeleted: jest.fn().mockReturnValue(false),
      getAge: jest.fn().mockReturnValue(1000000),
      getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
    };

    return { ...basePack, ...overrides } as StickerPack;
  };

  const createMockStickerPackItem = (
    overrides: Partial<StickerPackItem> = {},
  ): StickerPackItem => {
    const baseItem = {
      id: '1234567890123456789',
      uuid: 'test-item-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
      packId: '1234567890123456789',
      pack: createMockStickerPack(),
      stickerId: '1234567890123456789',
      sticker: createMockSticker(),
      sortValue: 0,
      generateId: jest.fn(),
      toJSON: jest.fn().mockReturnValue({}),
      isDeleted: jest.fn().mockReturnValue(false),
      getAge: jest.fn().mockReturnValue(1000000),
      getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
    };

    return { ...baseItem, ...overrides } as StickerPackItem;
  };

  // Mock repositories
  const mockStickerRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'deletedAt' },
        { propertyName: 'id' },
        { propertyName: 'name' },
        { propertyName: 'available' },
      ],
    },
  };

  const mockStickerPackRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'deletedAt' },
        { propertyName: 'id' },
        { propertyName: 'name' },
        { propertyName: 'slug' },
      ],
    },
  };

  const mockStickerPackItemRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    metadata: {
      columns: [
        { propertyName: 'deletedAt' },
        { propertyName: 'id' },
        { propertyName: 'packId' },
        { propertyName: 'stickerId' },
      ],
    },
  };

  // Mock services
  const mockMediaService = {
    findById: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getTtl: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    countKeysByPattern: jest.fn(),
    getRedisClient: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StickersService,
        {
          provide: getRepositoryToken(Sticker),
          useValue: mockStickerRepo,
        },
        {
          provide: getRepositoryToken(StickerPack),
          useValue: mockStickerPackRepo,
        },
        {
          provide: getRepositoryToken(StickerPackItem),
          useValue: mockStickerPackItemRepo,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StickersService>(StickersService);
    stickerRepo = module.get<Repository<Sticker>>(getRepositoryToken(Sticker));
    stickerPackRepo = module.get<Repository<StickerPack>>(
      getRepositoryToken(StickerPack),
    );
    stickerPackItemRepo = module.get<Repository<StickerPackItem>>(
      getRepositoryToken(StickerPackItem),
    );
    mediaService = module.get<MediaService>(MediaService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSticker', () => {
    it('should create a sticker successfully', async () => {
      // Arrange
      const dto: CreateStickerDto = {
        mediaId: '1234567890123456789',
        name: 'test-sticker',
        tags: 'test,cute',
        description: 'Test sticker',
        sortValue: 0,
      };
      const userId = '1234567890123456789';

      mockMediaService.findById.mockResolvedValue(mockMedia);
      jest.spyOn(service, 'create').mockResolvedValue(createMockSticker());
      jest.spyOn(service, 'findById').mockResolvedValue(createMockSticker());

      // Act
      const result = await service.createSticker(dto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockMediaService.findById).toHaveBeenCalledWith(dto.mediaId);
      expect(service.create).toHaveBeenCalledWith({
        mediaId: mockMedia.id,
        name: dto.name,
        tags: dto.tags,
        description: dto.description,
        format: STICKER_CONSTANTS.FORMATS.PNG.toUpperCase(),
        available: true,
        status: STICKER_CONSTANTS.STATUS.APPROVED,
        width: mockMedia.width,
        height: mockMedia.height,
        durationMs: undefined,
        sortValue: dto.sortValue,
        createdBy: userId,
        updatedBy: userId,
      });
    });

    it('should throw error when media not found', async () => {
      // Arrange
      const dto: CreateStickerDto = {
        mediaId: 'nonexistent',
        name: 'test-sticker',
      };
      const userId = '1234567890123456789';

      mockMediaService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createSticker(dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'media.MEDIA_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw error when media size exceeds limit', async () => {
      // Arrange
      const dto: CreateStickerDto = {
        mediaId: '1234567890123456789',
        name: 'test-sticker',
      };
      const userId = '1234567890123456789';
      const oversizedMedia = {
        ...mockMedia,
        size: STICKER_CONSTANTS.SIZE_LIMITS.MAX + 1,
      };

      mockMediaService.findById.mockResolvedValue(oversizedMedia);

      // Act & Assert
      await expect(service.createSticker(dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_SIZE_EXCEEDED },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when MIME type not supported', async () => {
      // Arrange
      const dto: CreateStickerDto = {
        mediaId: '1234567890123456789',
        name: 'test-sticker',
      };
      const userId = '1234567890123456789';
      const unsupportedMedia = { ...mockMedia, mimeType: 'application/pdf' };

      mockMediaService.findById.mockResolvedValue(unsupportedMedia);

      // Act & Assert
      await expect(service.createSticker(dto, userId)).rejects.toThrow(
        new HttpException(
          {
            messageKey:
              STICKER_CONSTANTS.MESSAGE_CODE.STICKER_FORMAT_NOT_SUPPORTED,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when media already used as sticker', async () => {
      // Arrange
      const dto: CreateStickerDto = {
        mediaId: '1234567890123456789',
        name: 'test-sticker',
      };
      const userId = '1234567890123456789';

      mockMediaService.findById.mockResolvedValue(mockMedia);
      mockStickerRepo.findOne.mockResolvedValue(createMockSticker());

      // Act & Assert
      await expect(service.createSticker(dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'sticker.MEDIA_ALREADY_USED_AS_STICKER' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('updateSticker', () => {
    it('should update sticker successfully', async () => {
      // Arrange
      const id = '1234567890123456789';
      const dto: UpdateStickerDto = {
        name: 'updated-sticker',
        tags: 'updated,test',
        description: 'Updated sticker',
      };
      const userId = '1234567890123456789';

      jest.spyOn(service, 'findById').mockResolvedValue(createMockSticker());
      jest.spyOn(service, 'update').mockResolvedValue(createMockSticker());

      // Act
      const result = await service.updateSticker(id, dto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, {
        ...dto,
        updatedBy: userId,
      });
    });

    it('should throw error when sticker not found', async () => {
      // Arrange
      const id = 'nonexistent';
      const dto: UpdateStickerDto = { name: 'updated-sticker' };
      const userId = '1234567890123456789';

      jest.spyOn(service, 'findById').mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(service.updateSticker(id, dto, userId)).rejects.toThrow();
    });
  });

  describe('deleteSticker', () => {
    it('should soft delete sticker successfully', async () => {
      // Arrange
      const id = '1234567890123456789';

      jest.spyOn(service, 'findById').mockResolvedValue(createMockSticker());
      jest.spyOn(service, 'update').mockResolvedValue(createMockSticker());

      // Act
      await service.deleteSticker(id);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(id);
      expect(service.update).toHaveBeenCalledWith(id, {
        available: false,
        status: STICKER_CONSTANTS.STATUS.REJECTED,
      });
    });

    it('should throw error when sticker not found', async () => {
      // Arrange
      const id = 'nonexistent';

      jest.spyOn(service, 'findById').mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(service.deleteSticker(id)).rejects.toThrow();
    });
  });

  describe('getStickers', () => {
    it('should return paginated stickers with filters', async () => {
      // Arrange
      const query: QueryStickersDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        format: STICKER_CONSTANTS.FORMATS.PNG,
        available: true,
        query: 'test',
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue({
        result: [createMockSticker()],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      // Act
      const result = await service.getStickers(query);

      // Assert
      expect(result).toBeDefined();
      expect(service.listOffset).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          order: 'DESC',
          query: 'test',
        },
        { format: STICKER_CONSTANTS.FORMATS.PNG, available: true },
        { relations: ['media', 'creator', 'updater'] },
      );
    });
  });

  describe('getAvailableStickers', () => {
    it('should return only available and approved stickers', async () => {
      // Arrange
      const query: QueryStickersDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      jest.spyOn(service, 'getStickers').mockResolvedValue({
        result: [createMockSticker()],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      // Act
      const result = await service.getAvailableStickers(query);

      // Assert
      expect(result).toBeDefined();
      expect(service.getStickers).toHaveBeenCalledWith({
        ...query,
        available: true,
        status: STICKER_CONSTANTS.STATUS.APPROVED,
      });
    });
  });

  describe('findAll', () => {
    it('should return all stickers with pagination', async () => {
      // Arrange
      const paginationDto: QueryStickersDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue({
        result: [createMockSticker()],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      });

      // Act
      const result = await service.findAll(paginationDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.listOffset).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findAllCursor', () => {
    it('should return stickers with cursor pagination', async () => {
      // Arrange
      const paginationDto = {
        limit: 10,
        cursor: 'test-cursor',
        page: 1,
        sortBy: 'createdAt',
        order: 'DESC' as const,
      };

      jest.spyOn(service, 'listCursor').mockResolvedValue({
        result: [createMockSticker()],
        metaData: {
          nextCursor: 'next-cursor',
          prevCursor: null,
          take: 10,
          sortBy: 'createdAt',
          order: 'DESC',
        },
      });

      // Act
      const result = await service.findAllCursor(paginationDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.listCursor).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('createStickerPack', () => {
    it('should create sticker pack successfully', async () => {
      // Arrange
      const dto: CreateStickerPackDto = {
        name: 'Test Pack',
        slug: 'test-pack',
        description: 'Test sticker pack',
        isPublished: true,
        sortValue: 0,
      };
      const userId = '1234567890123456789';

      mockStickerPackRepo.findOne.mockResolvedValue(null);
      mockStickerPackRepo.save.mockResolvedValue(createMockStickerPack());
      mockStickerPackRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockStickerPack());

      // Act
      const result = await service.createStickerPack(dto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockStickerPackRepo.findOne).toHaveBeenCalledWith({
        where: { slug: dto.slug },
      });
      expect(mockStickerPackRepo.save).toHaveBeenCalledWith({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
    });

    it('should throw error when slug already exists', async () => {
      // Arrange
      const dto: CreateStickerPackDto = {
        name: 'Test Pack',
        slug: 'existing-slug',
        description: 'Test sticker pack',
      };
      const userId = '1234567890123456789';

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());

      // Act & Assert
      await expect(service.createStickerPack(dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'sticker.PACK_SLUG_EXISTS' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when pack not found after creation', async () => {
      // Arrange
      const dto: CreateStickerPackDto = {
        name: 'Test Pack',
        slug: 'test-pack',
        description: 'Test sticker pack',
      };
      const userId = '1234567890123456789';

      mockStickerPackRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockStickerPackRepo.save.mockResolvedValue(createMockStickerPack());

      // Act & Assert
      await expect(service.createStickerPack(dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('updateStickerPack', () => {
    it('should update sticker pack successfully', async () => {
      // Arrange
      const id = '1234567890123456789';
      const dto: UpdateStickerPackDto = {
        name: 'Updated Pack',
        description: 'Updated description',
      };
      const userId = '1234567890123456789';

      mockStickerPackRepo.findOne
        .mockResolvedValueOnce(createMockStickerPack())
        .mockResolvedValueOnce(createMockStickerPack());
      mockStickerPackRepo.update.mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.updateStickerPack(id, dto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockStickerPackRepo.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockStickerPackRepo.update).toHaveBeenCalledWith(id, {
        ...dto,
        updatedBy: userId,
      });
    });

    it('should throw error when pack not found', async () => {
      // Arrange
      const id = 'nonexistent';
      const dto: UpdateStickerPackDto = { name: 'Updated Pack' };
      const userId = '1234567890123456789';

      mockStickerPackRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStickerPack(id, dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw error when new slug already exists', async () => {
      // Arrange
      const id = '1234567890123456789';
      const dto: UpdateStickerPackDto = {
        slug: 'existing-slug',
      };
      const userId = '1234567890123456789';
      const existingPack = createMockStickerPack({ slug: 'old-slug' });

      mockStickerPackRepo.findOne
        .mockResolvedValueOnce(existingPack)
        .mockResolvedValueOnce(
          createMockStickerPack({ slug: 'existing-slug' }),
        );

      // Act & Assert
      await expect(service.updateStickerPack(id, dto, userId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'sticker.PACK_SLUG_EXISTS' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('deleteStickerPack', () => {
    it('should soft delete sticker pack successfully', async () => {
      // Arrange
      const id = '1234567890123456789';

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());
      mockStickerPackRepo.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.deleteStickerPack(id);

      // Assert
      expect(mockStickerPackRepo.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockStickerPackRepo.update).toHaveBeenCalledWith(id, {
        isPublished: false,
      });
    });

    it('should throw error when pack not found', async () => {
      // Arrange
      const id = 'nonexistent';

      mockStickerPackRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteStickerPack(id)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('getStickerPacks', () => {
    it('should return paginated sticker packs with filters', async () => {
      // Arrange
      const query: QueryStickerPacksDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        isPublished: true,
        query: 'test',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[createMockStickerPack()], 1]),
      };

      mockStickerPackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getStickerPacks(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.result).toHaveLength(1);
      expect(result.metaData).toEqual({
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pack.isPublished = :isPublished',
        { isPublished: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(pack.name ILIKE :q OR pack.description ILIKE :q)',
        { q: '%test%' },
      );
    });
  });

  describe('getPublishedStickerPacks', () => {
    it('should return only published sticker packs', async () => {
      // Arrange
      const query: QueryStickerPacksDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      jest.spyOn(service, 'getStickerPacks').mockResolvedValue({
        result: [createMockStickerPack()],
        metaData: {
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          currentPage: 1,
          hasNextPage: false,
        },
      });

      // Act
      const result = await service.getPublishedStickerPacks(query);

      // Assert
      expect(result).toBeDefined();
      expect(service.getStickerPacks).toHaveBeenCalledWith({
        ...query,
        isPublished: true,
      });
    });
  });

  describe('getStickerPackById', () => {
    it('should return sticker pack with relations', async () => {
      // Arrange
      const id = '1234567890123456789';

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());

      // Act
      const result = await service.getStickerPackById(id);

      // Assert
      expect(result).toBeDefined();
      expect(mockStickerPackRepo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: [
          'creator',
          'updater',
          'items',
          'items.sticker',
          'items.sticker.media',
        ],
      });
    });

    it('should throw error when pack not found', async () => {
      // Arrange
      const id = 'nonexistent';

      mockStickerPackRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStickerPackById(id)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('addStickerToPack', () => {
    it('should add sticker to pack successfully', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: AddStickerToPackDto = {
        stickerId: '1234567890123456789',
        sortValue: 0,
      };

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());
      jest.spyOn(service, 'findById').mockResolvedValue(createMockSticker());
      mockStickerPackItemRepo.findOne.mockResolvedValue(null);
      mockStickerPackItemRepo.save.mockResolvedValue(
        createMockStickerPackItem(),
      );
      mockStickerPackItemRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockStickerPackItem());

      // Act
      const result = await service.addStickerToPack(packId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(mockStickerPackRepo.findOne).toHaveBeenCalledWith({
        where: { id: packId },
      });
      expect(service.findById).toHaveBeenCalledWith(dto.stickerId);
      expect(mockStickerPackItemRepo.save).toHaveBeenCalledWith({
        packId,
        stickerId: dto.stickerId,
        sortValue: dto.sortValue,
      });
    });

    it('should throw error when pack not found', async () => {
      // Arrange
      const packId = 'nonexistent';
      const dto: AddStickerToPackDto = { stickerId: '1234567890123456789' };

      mockStickerPackRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addStickerToPack(packId, dto)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_NOT_FOUND },
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw error when sticker not usable', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: AddStickerToPackDto = { stickerId: '1234567890123456789' };
      const unusableSticker = createMockSticker();
      unusableSticker.isUsable = jest.fn().mockReturnValue(false);

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());
      jest.spyOn(service, 'findById').mockResolvedValue(unusableSticker);

      // Act & Assert
      await expect(service.addStickerToPack(packId, dto)).rejects.toThrow(
        new HttpException(
          { messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_NOT_AVAILABLE },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when sticker already in pack', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: AddStickerToPackDto = { stickerId: '1234567890123456789' };

      mockStickerPackRepo.findOne.mockResolvedValue(createMockStickerPack());
      jest.spyOn(service, 'findById').mockResolvedValue(createMockSticker());
      mockStickerPackItemRepo.findOne.mockResolvedValue(
        createMockStickerPackItem(),
      );

      // Act & Assert
      await expect(service.addStickerToPack(packId, dto)).rejects.toThrow(
        new HttpException(
          {
            messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_ITEM_EXISTS,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('removeStickerFromPack', () => {
    it('should remove sticker from pack successfully', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: RemoveStickerFromPackDto = {
        stickerId: '1234567890123456789',
      };

      mockStickerPackItemRepo.findOne.mockResolvedValue(
        createMockStickerPackItem(),
      );
      mockStickerPackItemRepo.remove.mockResolvedValue(
        createMockStickerPackItem(),
      );

      // Act
      await service.removeStickerFromPack(packId, dto);

      // Assert
      expect(mockStickerPackItemRepo.findOne).toHaveBeenCalledWith({
        where: { packId, stickerId: dto.stickerId },
      });
      expect(mockStickerPackItemRepo.remove).toHaveBeenCalledWith(
        expect.any(Object),
      );
    });

    it('should throw error when pack item not found', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: RemoveStickerFromPackDto = {
        stickerId: 'nonexistent',
      };

      mockStickerPackItemRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeStickerFromPack(packId, dto)).rejects.toThrow(
        new HttpException(
          {
            messageKey:
              STICKER_CONSTANTS.MESSAGE_CODE.STICKER_PACK_ITEM_NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('reorderStickerPackItems', () => {
    it('should reorder stickers in pack successfully', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: ReorderStickerPackItemsDto = {
        stickerIds: ['sticker1', 'sticker2', 'sticker3'],
      };

      mockStickerPackItemRepo.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.reorderStickerPackItems(packId, dto);

      // Assert
      expect(mockStickerPackItemRepo.update).toHaveBeenCalledTimes(3);
      expect(mockStickerPackItemRepo.update).toHaveBeenCalledWith(
        { packId, stickerId: 'sticker1' },
        { sortValue: 0 },
      );
      expect(mockStickerPackItemRepo.update).toHaveBeenCalledWith(
        { packId, stickerId: 'sticker2' },
        { sortValue: 1 },
      );
      expect(mockStickerPackItemRepo.update).toHaveBeenCalledWith(
        { packId, stickerId: 'sticker3' },
        { sortValue: 2 },
      );
    });
  });

  describe('batchPackItems', () => {
    it('should perform batch operations successfully', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: BatchPackItemsDto = {
        addStickerIds: ['sticker1', 'sticker2'],
        removeStickerIds: ['sticker3', 'sticker4'],
        reorderStickerIds: ['sticker1', 'sticker2'],
      };

      jest
        .spyOn(service, 'addStickerToPack')
        .mockResolvedValue(createMockStickerPackItem());
      jest.spyOn(service, 'removeStickerFromPack').mockResolvedValue();
      jest.spyOn(service, 'reorderStickerPackItems').mockResolvedValue();

      // Act
      await service.batchPackItems(packId, dto);

      // Assert
      expect(service.addStickerToPack).toHaveBeenCalledTimes(2);
      expect(service.addStickerToPack).toHaveBeenCalledWith(packId, {
        stickerId: 'sticker1',
      });
      expect(service.addStickerToPack).toHaveBeenCalledWith(packId, {
        stickerId: 'sticker2',
      });
      expect(service.removeStickerFromPack).toHaveBeenCalledTimes(2);
      expect(service.removeStickerFromPack).toHaveBeenCalledWith(packId, {
        stickerId: 'sticker3',
      });
      expect(service.removeStickerFromPack).toHaveBeenCalledWith(packId, {
        stickerId: 'sticker4',
      });
      expect(service.reorderStickerPackItems).toHaveBeenCalledWith(packId, {
        stickerIds: ['sticker1', 'sticker2'],
      });
    });

    it('should handle empty batch operations', async () => {
      // Arrange
      const packId = '1234567890123456789';
      const dto: BatchPackItemsDto = {};

      jest
        .spyOn(service, 'addStickerToPack')
        .mockResolvedValue(createMockStickerPackItem());
      jest.spyOn(service, 'removeStickerFromPack').mockResolvedValue();
      jest.spyOn(service, 'reorderStickerPackItems').mockResolvedValue();

      // Act
      await service.batchPackItems(packId, dto);

      // Assert
      expect(service.addStickerToPack).not.toHaveBeenCalled();
      expect(service.removeStickerFromPack).not.toHaveBeenCalled();
      expect(service.reorderStickerPackItems).not.toHaveBeenCalled();
    });
  });

  describe('Private Methods', () => {
    describe('validateStickerMedia', () => {
      it('should validate media successfully', async () => {
        // Arrange
        const media = { ...mockMedia, size: 100000 }; // Ensure size is within limits
        mockStickerRepo.findOne.mockResolvedValue(null); // No existing sticker

        // Act & Assert
        await expect(
          (service as any).validateStickerMedia(media),
        ).resolves.not.toThrow();
      });

      it('should throw error for oversized media', async () => {
        // Arrange
        const oversizedMedia = {
          ...mockMedia,
          size: STICKER_CONSTANTS.SIZE_LIMITS.MAX + 1,
        };

        // Act & Assert
        await expect(
          (service as any).validateStickerMedia(oversizedMedia),
        ).rejects.toThrow(
          new HttpException(
            {
              messageKey: STICKER_CONSTANTS.MESSAGE_CODE.STICKER_SIZE_EXCEEDED,
            },
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw error for unsupported MIME type', async () => {
        // Arrange
        const unsupportedMedia = { ...mockMedia, mimeType: 'application/pdf' };

        // Act & Assert
        await expect(
          (service as any).validateStickerMedia(unsupportedMedia),
        ).rejects.toThrow(
          new HttpException(
            {
              messageKey:
                STICKER_CONSTANTS.MESSAGE_CODE.STICKER_FORMAT_NOT_SUPPORTED,
            },
            HttpStatus.BAD_REQUEST,
          ),
        );
      });

      it('should throw error when media already used as sticker', async () => {
        // Arrange
        const media = mockMedia;
        mockStickerRepo.findOne.mockResolvedValue(createMockSticker());

        // Act & Assert
        await expect(
          (service as any).validateStickerMedia(media),
        ).rejects.toThrow(
          new HttpException(
            { messageKey: 'sticker.MEDIA_ALREADY_USED_AS_STICKER' },
            HttpStatus.BAD_REQUEST,
          ),
        );
      });
    });

    describe('determineStickerFormat', () => {
      it('should determine PNG format', () => {
        // Act
        const result = (service as any).determineStickerFormat('image/png');

        // Assert
        expect(result).toBe(STICKER_CONSTANTS.FORMATS.PNG.toUpperCase());
      });

      it('should determine GIF format', () => {
        // Act
        const result = (service as any).determineStickerFormat('image/gif');

        // Assert
        expect(result).toBe(STICKER_CONSTANTS.FORMATS.GIF.toUpperCase());
      });

      it('should determine APNG format', () => {
        // Act
        const result = (service as any).determineStickerFormat('image/apng');

        // Assert
        expect(result).toBe(STICKER_CONSTANTS.FORMATS.APNG.toUpperCase());
      });

      it('should throw error for unsupported format', () => {
        // Act & Assert
        expect(() =>
          (service as any).determineStickerFormat('application/pdf'),
        ).toThrow(
          new HttpException(
            {
              messageKey:
                STICKER_CONSTANTS.MESSAGE_CODE.STICKER_FORMAT_NOT_SUPPORTED,
            },
            HttpStatus.BAD_REQUEST,
          ),
        );
      });
    });

    describe('extractStickerMetadata', () => {
      it('should extract metadata from static media', () => {
        // Arrange
        const media = { ...mockMedia, duration: 0 };

        // Act
        const result = (service as any).extractStickerMetadata(media);

        // Assert
        expect(result).toEqual({
          width: 320,
          height: 320,
          durationMs: undefined,
        });
      });

      it('should extract metadata from animated media', () => {
        // Arrange
        const media = { ...mockMedia, duration: 2.5 };

        // Act
        const result = (service as any).extractStickerMetadata(media);

        // Assert
        expect(result).toEqual({
          width: 320,
          height: 320,
          durationMs: 2500,
        });
      });

      it('should handle media without dimensions', () => {
        // Arrange
        const media = { ...mockMedia, width: null, height: null };

        // Act
        const result = (service as any).extractStickerMetadata(media);

        // Assert
        expect(result).toEqual({
          width: undefined,
          height: undefined,
          durationMs: undefined,
        });
      });
    });
  });

  describe('getSearchableColumns', () => {
    it('should return correct searchable columns', () => {
      // Act
      const result = (service as any).getSearchableColumns();

      // Assert
      expect(result).toEqual(['name', 'tags', 'description']);
    });
  });
});
