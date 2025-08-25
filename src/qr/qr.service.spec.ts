import {
  QR_REDIS_PREFIXES,
  QrActionType,
  QrGrant,
  QrTicket,
} from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateTicketDto } from './dto';
import { QrActionExecutorService } from './qr-action-executor.service';
import { QrService } from './qr.service';
import { generateCodeChallenge } from './qr.utils';

// Helper function to generate valid test ticket IDs
function createValidTicketId(prefix: string = 'test'): string {
  return Buffer.from(`${prefix}1234567890abcdef`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createValidCodeChallenge(prefix: string = 'challenge'): string {
  return Buffer.from(`${prefix}1234567890abcdef`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Mock the CacheService
const mockCacheService = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  findKeysByPattern: jest.fn(),
  atomicIncrementWithLimit: jest.fn(),
};

// Mock the QrActionExecutorService
const mockActionExecutor = {
  execute: jest.fn(),
};

// Mock the ConfigService
const mockConfigService = {
  get: jest.fn(),
};

describe('QrService', () => {
  let service: QrService;
  let cacheService: CacheService;
  let actionExecutor: QrActionExecutorService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: QrActionExecutorService,
          useValue: mockActionExecutor,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QrService>(QrService);
    cacheService = module.get<CacheService>(CacheService);
    actionExecutor = module.get<QrActionExecutorService>(
      QrActionExecutorService,
    );
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'QR_TICKET_TTL_SECONDS':
          return 180;
        case 'QR_GRANT_TTL_SECONDS':
          return 30;
        case 'APP_URL':
          return 'https://example.com';
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      const createTicketDto: CreateTicketDto = {
        type: QrActionType.LOGIN,
        payload: {},
      };

      const result = await service.createTicket(createTicketDto);

      expect(result).toHaveProperty('ticketId');
      expect(result).toHaveProperty('codeChallenge');
      expect(result).toHaveProperty('qrContent');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('PENDING');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(QR_REDIS_PREFIXES.TICKET),
        expect.objectContaining({
          type: QrActionType.LOGIN,
          status: 'PENDING',
        }),
        180,
      );
    });

    it('should create a ticket with web session ID', async () => {
      const createTicketDto: CreateTicketDto = {
        type: QrActionType.ADD_FRIEND,
        payload: { friendUserId: '123' },
        webSessionId: 'session_123',
      };

      const result = await service.createTicket(createTicketDto, 'session_123');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          webSessionId: 'session_123',
        }),
        180,
      );
    });

    it('should generate unique ticket IDs for different requests', async () => {
      const createTicketDto: CreateTicketDto = {
        type: QrActionType.LOGIN,
      };

      const result1 = await service.createTicket(createTicketDto);
      const result2 = await service.createTicket(createTicketDto);

      expect(result1.ticketId).not.toBe(result2.ticketId);
    });
  });

  describe('getTicket', () => {
    it('should return ticket when it exists', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'PENDING',
        codeChallenge: validChallenge,
        createdAt: Date.now(),
        expiresAt: Date.now() + 180000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      const result = await service.getTicket(validTid);

      expect(result).toEqual(mockTicket);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `${QR_REDIS_PREFIXES.TICKET}${validTid}`,
      );
    });

    it('should return null when ticket does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const validTid = createValidTicketId('nonexistent');
      const result = await service.getTicket(validTid);

      expect(result).toBeNull();
    });

    it('should mark expired tickets as EXPIRED', async () => {
      const validTid = createValidTicketId('expired');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'PENDING',
        codeChallenge: validChallenge,
        createdAt: Date.now() - 200000, // 200 seconds ago
        expiresAt: Date.now() - 20000, // 20 seconds ago (expired)
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      const result = await service.getTicket(validTid);

      expect(result?.status).toBe('EXPIRED');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'EXPIRED' }),
        180,
      );
    });
  });

  describe('getTicketPreview', () => {
    it('should return safe preview data', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.ADD_FRIEND,
        status: 'PENDING',
        codeChallenge: validChallenge,
        payload: { friendUserId: '123', friendName: 'John Doe' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 180000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      const result = await service.getTicketPreview(validTid);

      expect(result.type).toBe(QrActionType.ADD_FRIEND);
      expect(result.status).toBe('PENDING');
      expect(result.isExpired).toBe(false);
      expect(result.payloadPreview).toBeDefined();
      expect(result.payloadPreview?.friendName).toBe('John Doe');
      // Sensitive data should be replaced with [Sensitive Data]
      expect(result.payloadPreview?.friendUserId).toBe('[Sensitive Data]');
    });

    it('should throw error for non-existent ticket', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const validTid = createValidTicketId('nonexistent');
      await expect(service.getTicketPreview(validTid)).rejects.toThrow();
    });
  });

  describe('scanTicket', () => {
    it('should mark ticket as scanned successfully', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'PENDING',
        codeChallenge: validChallenge,
        createdAt: Date.now(),
        expiresAt: Date.now() + 180000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      const result = await service.scanTicket(validTid, 'user123');

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'SCANNED',
          scannedBy: 'user123',
          scannedAt: expect.any(Number) as number,
        }),
        180,
      );
    });

    it('should throw error for non-existent ticket', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const validTid = createValidTicketId('nonexistent');
      await expect(service.scanTicket(validTid, 'user123')).rejects.toThrow();
    });

    it('should throw error for non-pending ticket', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'SCANNED',
        codeChallenge: validChallenge,
        createdAt: Date.now(),
        expiresAt: Date.now() + 180000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      await expect(service.scanTicket(validTid, 'user123')).rejects.toThrow();
    });

    it('should throw error for expired ticket', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'PENDING',
        codeChallenge: validChallenge,
        createdAt: Date.now() - 200000,
        expiresAt: Date.now() - 20000, // expired
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      await expect(service.scanTicket(validTid, 'user123')).rejects.toThrow();
    });
  });

  describe('approveTicket', () => {
    it('should approve ticket and execute action successfully', async () => {
      const validTid = createValidTicketId('test');
      const validVerifier =
        'verifier1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const validChallenge = generateCodeChallenge(validVerifier);

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'SCANNED',
        codeChallenge: validChallenge,
        scannedBy: 'user123',
        scannedAt: Date.now(),
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 80000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);
      mockActionExecutor.execute.mockResolvedValue(undefined);

      const result = await service.approveTicket(
        validTid,
        'user123',
        validVerifier,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'APPROVED',
          approvedBy: 'user123',
          approvedAt: expect.any(Number) as number,
        }),
        180,
      );
      expect(mockActionExecutor.execute).toHaveBeenCalledWith(
        QrActionType.LOGIN,
        expect.objectContaining({
          tid: validTid,
          userId: 'user123',
        }),
      );
    });

    it('should throw error for invalid code verifier', async () => {
      const validTid = createValidTicketId('test');
      const validVerifier =
        'verifier1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const validChallenge = generateCodeChallenge(validVerifier);

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'SCANNED',
        codeChallenge: validChallenge,
        scannedBy: 'user123',
        scannedAt: Date.now(),
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 80000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      await expect(
        service.approveTicket(validTid, 'user123', 'invalid_verifier'),
      ).rejects.toThrow();
    });

    it('should revert status on action execution failure', async () => {
      const validTid = createValidTicketId('test');
      const validVerifier =
        'verifier1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const validChallenge = generateCodeChallenge(validVerifier);

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'SCANNED',
        codeChallenge: validChallenge,
        scannedBy: 'user123',
        scannedAt: Date.now(),
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 80000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);
      mockActionExecutor.execute.mockRejectedValue(new Error('Action failed'));

      await expect(
        service.approveTicket(validTid, 'user123', validVerifier),
      ).rejects.toThrow();

      // Should revert to PENDING status
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'PENDING' }),
        180,
      );
    });
  });

  describe('rejectTicket', () => {
    it('should reject ticket successfully', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'SCANNED',
        codeChallenge: validChallenge,
        scannedBy: 'user123',
        scannedAt: Date.now(),
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 80000,
      };

      mockCacheService.get.mockResolvedValue(mockTicket);

      const result = await service.rejectTicket(validTid, 'user123');

      expect(result).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'REJECTED',
        }),
        180,
      );
    });
  });

  describe('exchangeGrant', () => {
    it('should exchange grant token successfully', async () => {
      const validTid = createValidTicketId('test');
      const validChallenge = createValidCodeChallenge('challenge');

      const mockGrant: QrGrant = {
        tid: validTid,
        type: QrActionType.LOGIN,
        userId: 'user123',
        createdAt: Date.now(),
        expiresAt: Date.now() + 30000,
      };

      const mockTicket: QrTicket = {
        tid: validTid,
        type: QrActionType.LOGIN,
        status: 'APPROVED',
        codeChallenge: validChallenge,
        approvedBy: 'user123',
        approvedAt: Date.now(),
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 80000,
      };

      mockCacheService.get
        .mockResolvedValueOnce(mockGrant) // First call for grant
        .mockResolvedValueOnce(mockTicket); // Second call for ticket

      const result = await service.exchangeGrant('grant123');

      expect(result).toEqual(mockGrant);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'USED' }),
        180,
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `${QR_REDIS_PREFIXES.GRANT}grant123`,
      );
    });

    it('should throw error for non-existent grant', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const validGrantToken = createValidTicketId('grant');
      await expect(service.exchangeGrant(validGrantToken)).rejects.toThrow();
    });

    it('should throw error for expired grant', async () => {
      const validTid = createValidTicketId('test');
      const validGrantToken = createValidTicketId('expired');

      const mockGrant: QrGrant = {
        tid: validTid,
        type: QrActionType.LOGIN,
        userId: 'user123',
        createdAt: Date.now() - 40000,
        expiresAt: Date.now() - 10000, // expired
      };

      mockCacheService.get.mockResolvedValue(mockGrant);

      await expect(service.exchangeGrant(validGrantToken)).rejects.toThrow();
    });
  });

  describe('cleanupExpired', () => {
    it('should clean up expired tickets and grants', async () => {
      const expiredTicketKeys = [
        `${QR_REDIS_PREFIXES.TICKET}expired1`,
        `${QR_REDIS_PREFIXES.TICKET}expired2`,
      ];
      const expiredGrantKeys = [`${QR_REDIS_PREFIXES.GRANT}expired1`];

      mockCacheService.findKeysByPattern
        .mockResolvedValueOnce(expiredTicketKeys)
        .mockResolvedValueOnce(expiredGrantKeys);

      // Mock expired tickets
      mockCacheService.get
        .mockResolvedValueOnce({ expiresAt: Date.now() - 10000 }) // expired
        .mockResolvedValueOnce({ expiresAt: Date.now() - 10000 }) // expired
        .mockResolvedValueOnce({ expiresAt: Date.now() - 10000 }); // expired grant

      const result = await service.cleanupExpired();

      expect(result.tickets).toBe(2);
      expect(result.grants).toBe(1);
      expect(mockCacheService.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const ticketKeys = [
        `${QR_REDIS_PREFIXES.TICKET}ticket1`,
        `${QR_REDIS_PREFIXES.TICKET}ticket2`,
      ];
      const grantKeys = [`${QR_REDIS_PREFIXES.GRANT}grant1`];

      mockCacheService.findKeysByPattern
        .mockResolvedValueOnce(ticketKeys)
        .mockResolvedValueOnce(grantKeys);

      // Mock tickets
      mockCacheService.get
        .mockResolvedValueOnce({
          type: QrActionType.LOGIN,
          expiresAt: Date.now() + 100000,
          status: 'PENDING',
        })
        .mockResolvedValueOnce({
          type: QrActionType.ADD_FRIEND,
          expiresAt: Date.now() + 100000,
          status: 'APPROVED',
        });

      // Mock grant
      mockCacheService.get.mockResolvedValueOnce({
        expiresAt: Date.now() + 10000,
      });

      const result = await service.getStats();

      expect(result.totalTickets).toBe(2);
      expect(result.activeTickets).toBe(2);
      expect(result.totalGrants).toBe(1);
      expect(result.activeGrants).toBe(1);
      expect(result.actionTypeBreakdown[QrActionType.LOGIN]).toBe(1);
      expect(result.actionTypeBreakdown[QrActionType.ADD_FRIEND]).toBe(1);
    });
  });
});
