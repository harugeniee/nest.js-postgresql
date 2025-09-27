import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShareService } from './share.service';
import { ShareLink } from './entities/share-link.entity';
import { ShareSession } from './entities/share-session.entity';
import { ShareClick } from './entities/share-click.entity';
import { ShareAttribution } from './entities/share-attribution.entity';
import { ShareConversion } from './entities/share-conversion.entity';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { CacheService, RabbitMQService } from 'src/shared/services';

describe('ShareService', () => {
  let service: ShareService;
  let shareLinkRepository: Repository<ShareLink>;
  let shareSessionRepository: Repository<ShareSession>;
  let shareClickRepository: Repository<ShareClick>;
  let shareAttributionRepository: Repository<ShareAttribution>;
  let shareConversionRepository: Repository<ShareConversion>;
  let cacheService: CacheService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      findOne: jest.fn(),
    },
    metadata: {
      columns: [],
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    getTtl: jest.fn(),
  };

  const mockRabbitMQService = {
    sendDataToRabbitMQAsync: jest.fn(),
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        {
          provide: getRepositoryToken(ShareLink),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareSession),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareClick),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareAttribution),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ShareConversion),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
    shareLinkRepository = module.get<Repository<ShareLink>>(
      getRepositoryToken(ShareLink),
    );
    shareSessionRepository = module.get<Repository<ShareSession>>(
      getRepositoryToken(ShareSession),
    );
    shareClickRepository = module.get<Repository<ShareClick>>(
      getRepositoryToken(ShareClick),
    );
    shareAttributionRepository = module.get<Repository<ShareAttribution>>(
      getRepositoryToken(ShareAttribution),
    );
    shareConversionRepository = module.get<Repository<ShareConversion>>(
      getRepositoryToken(ShareConversion),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShareLink', () => {
    it('should create a share link with unique code', async () => {
      const createShareLinkDto: CreateShareLinkDto = {
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        channelId: '789',
        campaignId: '101',
        note: 'Test share link',
        isActive: true,
      };

      const mockShareLink = {
        id: '1',
        code: 'abc123',
        ...createShareLinkDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the generateUniqueCode method
      jest
        .spyOn(service as any, 'generateUniqueCode')
        .mockResolvedValue('abc123');

      // Mock the BaseService create method
      jest.spyOn(service, 'create').mockResolvedValue(mockShareLink as any);

      const result = await service.createShareLink(createShareLinkDto);

      expect(result).toEqual(mockShareLink);
      expect(service.create).toHaveBeenCalledWith({
        ...createShareLinkDto,
        code: 'abc123',
      });
    });
  });

  describe('getShareLinkByCode', () => {
    it('should return share link by code with resolved content', async () => {
      const code = 'abc123';
      const mockShareLink = {
        id: '1',
        code,
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        isActive: true,
        content: null,
      };

      const mockArticle = {
        id: '123',
        title: 'Test Article',
        slug: 'test-article',
        user: { id: '456', username: 'testuser' },
      };

      // Mock the BaseService findOne method
      jest.spyOn(service, 'findOne').mockResolvedValue(mockShareLink as any);

      // Mock the resolveContent method
      jest
        .spyOn(service as any, 'resolveContent')
        .mockResolvedValue(mockArticle);

      const result = await service.getShareLinkByCode(code);

      expect(result).toEqual({
        ...mockShareLink,
        content: mockArticle,
      });
      expect(service.findOne).toHaveBeenCalledWith(
        { code, isActive: true },
        { relations: ['user', 'channel', 'campaign'] },
      );
      expect((service as any).resolveContent).toHaveBeenCalledWith(
        'article',
        '123',
      );
    });

    it('should return null if share link not found', async () => {
      const code = 'nonexistent';

      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      const result = await service.getShareLinkByCode(code);

      expect(result).toBeNull();
    });
  });

  describe('isBot', () => {
    it('should detect bot user agents', () => {
      const botUserAgents = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Twitterbot/1.0',
        'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com/crawler)',
        'WhatsApp/2.19.81 A',
        'TelegramBot (like TwitterBot)',
      ];

      botUserAgents.forEach((userAgent) => {
        expect(service.isBot(userAgent)).toBe(true);
      });
    });

    it('should not detect regular browsers as bots', () => {
      const regularUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      ];

      regularUserAgents.forEach((userAgent) => {
        expect(service.isBot(userAgent)).toBe(false);
      });
    });
  });

  describe('generateIpHash', () => {
    it('should generate consistent hash for same input', () => {
      const ip = '192.168.1.1';
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const secret = 'test-secret';

      const hash1 = service.generateIpHash(ip, userAgent, secret);
      const hash2 = service.generateIpHash(ip, userAgent, secret);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different inputs', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const secret = 'test-secret';

      const hash1 = service.generateIpHash(ip1, userAgent, secret);
      const hash2 = service.generateIpHash(ip2, userAgent, secret);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateUaHash', () => {
    it('should generate consistent hash for same user agent', () => {
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      const hash1 = service.generateUaHash(userAgent);
      const hash2 = service.generateUaHash(userAgent);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different user agents', () => {
      const userAgent1 =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const userAgent2 =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';

      const hash1 = service.generateUaHash(userAgent1);
      const hash2 = service.generateUaHash(userAgent2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
