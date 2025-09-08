import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from 'src/shared/services';
import { QrPollingService } from './qr-polling.service';

describe('QrPollingService', () => {
  let service: QrPollingService;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getRedisClient: jest.fn(() => ({
        duplicate: jest.fn(() => ({
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
          quit: jest.fn(),
          on: jest.fn(),
        })),
        publish: jest.fn(),
      })),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(30), // Default delivery code TTL
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrPollingService,
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

    service = module.get<QrPollingService>(QrPollingService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('readTicketSnapshot', () => {
    it('should return null for non-existent ticket', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.readTicketSnapshot('non-existent');

      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalledWith('QR:TICKET:non-existent');
    });

    it('should return ticket snapshot for existing ticket', async () => {
      const mockTicket = {
        tid: 'test-ticket',
        status: 'PENDING',
        expiresAt: Date.now() + 300000, // 5 minutes from now
        version: 1,
        webSessionId: 'session-123',
      };

      cacheService.get.mockResolvedValue(mockTicket);

      const result = await service.readTicketSnapshot('test-ticket');

      expect(result).toEqual({
        status: 'PENDING',
        expiresAt: mockTicket.expiresAt,
        version: 1,
        webSessionId: 'session-123',
      });
    });

    it('should mark expired ticket as EXPIRED and increment version', async () => {
      const mockTicket = {
        tid: 'expired-ticket',
        status: 'PENDING',
        expiresAt: Date.now() - 1000, // 1 second ago
        version: 1,
      };

      cacheService.get.mockResolvedValue(mockTicket);

      const result = await service.readTicketSnapshot('expired-ticket');

      expect(result?.status).toBe('EXPIRED');
      expect(result?.version).toBe(2);
      expect(cacheService.set).toHaveBeenCalledWith(
        'QR:TICKET:expired-ticket',
        expect.objectContaining({
          status: 'EXPIRED',
          version: 2,
        }),
        expect.any(Number),
      );
    });
  });

  describe('tryGetDeliveryCode', () => {
    it('should return null for non-existent delivery code', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.tryGetDeliveryCode(
        'test-ticket',
        'session-123',
      );

      expect(result).toBeNull();
    });

    it('should return null for expired delivery code', async () => {
      const mockDelivery = {
        deliveryCode: 'test-code',
        tid: 'test-ticket',
        webSessionId: 'session-123',
        expiresAt: Date.now() - 1000, // 1 second ago
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.tryGetDeliveryCode(
        'test-ticket',
        'session-123',
      );

      expect(result).toBeNull();
      expect(cacheService.delete).toHaveBeenCalledWith(
        'QR:DELIVERY:test-ticket',
      );
    });

    it('should return null for mismatched webSessionId', async () => {
      const mockDelivery = {
        deliveryCode: 'test-code',
        tid: 'test-ticket',
        webSessionId: 'different-session',
        expiresAt: Date.now() + 30000, // 30 seconds from now
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.tryGetDeliveryCode(
        'test-ticket',
        'session-123',
      );

      expect(result).toBeNull();
    });

    it('should return delivery code for valid request', async () => {
      const mockDelivery = {
        deliveryCode: 'test-code',
        tid: 'test-ticket',
        webSessionId: 'session-123',
        expiresAt: Date.now() + 30000, // 30 seconds from now
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.tryGetDeliveryCode(
        'test-ticket',
        'session-123',
      );

      expect(result).toBe('test-code');
    });
  });

  describe('createDeliveryCode', () => {
    it('should create and store delivery code', async () => {
      const result = await service.createDeliveryCode(
        'test-ticket',
        'session-123',
      );

      expect(result).toMatch(/^[A-Za-z0-9\-_]+$/); // Base64url format
      expect(cacheService.set).toHaveBeenCalledWith(
        'QR:DELIVERY:test-ticket',
        expect.objectContaining({
          tid: 'test-ticket',
          webSessionId: 'session-123',
          deliveryCode: result,
        }),
        30, // TTL from config
      );
    });
  });

  describe('validateAndConsumeDeliveryCode', () => {
    it('should return false for non-existent delivery code', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.validateAndConsumeDeliveryCode(
        'test-ticket',
        'test-code',
      );

      expect(result).toBe(false);
    });

    it('should return false for expired delivery code', async () => {
      const mockDelivery = {
        deliveryCode: 'test-code',
        tid: 'test-ticket',
        webSessionId: 'session-123',
        expiresAt: Date.now() - 1000, // 1 second ago
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.validateAndConsumeDeliveryCode(
        'test-ticket',
        'test-code',
      );

      expect(result).toBe(false);
      expect(cacheService.delete).toHaveBeenCalledWith(
        'QR:DELIVERY:test-ticket',
      );
    });

    it('should return false for mismatched delivery code', async () => {
      const mockDelivery = {
        deliveryCode: 'different-code',
        tid: 'test-ticket',
        webSessionId: 'session-123',
        expiresAt: Date.now() + 30000, // 30 seconds from now
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.validateAndConsumeDeliveryCode(
        'test-ticket',
        'test-code',
      );

      expect(result).toBe(false);
    });

    it('should return true and consume valid delivery code', async () => {
      const mockDelivery = {
        deliveryCode: 'test-code',
        tid: 'test-ticket',
        webSessionId: 'session-123',
        expiresAt: Date.now() + 30000, // 30 seconds from now
      };

      cacheService.get.mockResolvedValue(mockDelivery);

      const result = await service.validateAndConsumeDeliveryCode(
        'test-ticket',
        'test-code',
      );

      expect(result).toBe(true);
      expect(cacheService.delete).toHaveBeenCalledWith(
        'QR:DELIVERY:test-ticket',
      );
    });
  });

  describe('publishStatusChange', () => {
    it('should publish status change to Redis', async () => {
      const mockRedis = {
        publish: jest.fn(),
      };
      cacheService.getRedisClient.mockReturnValue(mockRedis as any);

      await service.publishStatusChange('test-ticket', 'APPROVED', 5);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'qr:status:test-ticket',
        expect.stringContaining('"tid":"test-ticket"'),
      );
    });
  });
});
