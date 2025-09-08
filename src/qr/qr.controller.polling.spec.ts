import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/shared/services';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { QrGateway } from './qr.gateway';
import { QrPollingService } from './qr-polling.service';
import { QrPollingRateLimitGuard } from './guards/qr-polling-rate-limit.guard';

describe('QrController Polling', () => {
  let controller: QrController;
  let pollingService: jest.Mocked<QrPollingService>;

  beforeEach(async () => {
    const mockPollingService = {
      readTicketSnapshot: jest.fn(),
      tryGetDeliveryCode: jest.fn(),
      waitForChangeOrTimeout: jest.fn(),
    };

    const mockQrService = {
      // Mock other methods as needed
    };

    const mockQrGateway = {
      // Mock other methods as needed
    };

    const mockCacheService = {
      // Mock methods as needed
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        {
          provide: QrService,
          useValue: mockQrService,
        },
        {
          provide: QrGateway,
          useValue: mockQrGateway,
        },
        {
          provide: QrPollingService,
          useValue: mockPollingService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    })
      .overrideGuard(QrPollingRateLimitGuard)
      .useValue({ canActivate: () => true }) // Bypass rate limiting in tests
      .compile();

    controller = module.get<QrController>(QrController);
    pollingService = module.get(QrPollingService);
  });

  describe('pollTicket', () => {
    it('should return 400 if webSessionId is missing', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      await expect(
        controller.pollTicket('test-ticket', '', mockReq, mockRes),
      ).rejects.toThrow('webSessionId query parameter is required');
    });

    it('should return 400 if ticket not found', async () => {
      pollingService.readTicketSnapshot.mockResolvedValue(null);

      const mockReq = { headers: {} } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      await expect(
        controller.pollTicket('test-ticket', 'session-123', mockReq, mockRes),
      ).rejects.toThrow('Ticket not found');
    });

    it('should return 304 if ETag matches', async () => {
      const mockSnapshot = {
        status: 'PENDING' as const,
        expiresAt: Date.now() + 300000,
        version: 5,
      };

      pollingService.readTicketSnapshot.mockResolvedValue(mockSnapshot);

      const mockReq = {
        headers: { 'if-none-match': 'W/"test-ticket:5"' },
      } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      await expect(
        controller.pollTicket('test-ticket', 'session-123', mockReq, mockRes),
      ).rejects.toThrow(); // NotModifiedException
    });

    it('should return poll response for valid request', async () => {
      const mockSnapshot = {
        status: 'PENDING' as const,
        expiresAt: Date.now() + 300000,
        version: 5,
      };

      pollingService.readTicketSnapshot.mockResolvedValue(mockSnapshot);

      const mockReq = { headers: {} } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      const result = await controller.pollTicket(
        'test-ticket',
        'session-123',
        mockReq,
        mockRes,
      );

      expect(result).toEqual({
        tid: 'test-ticket',
        status: 'PENDING' as const,
        expiresAt: expect.any(String),
        grantReady: false,
        nextPollAfterMs: 2000,
        version: 5,
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'ETag',
        'W/"test-ticket:5"',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, must-revalidate',
      );
    });

    it('should include deliveryCode when ticket is approved and grantReady', async () => {
      const mockSnapshot = {
        status: 'APPROVED' as const,
        expiresAt: Date.now() + 300000,
        version: 5,
      };

      pollingService.readTicketSnapshot.mockResolvedValue(mockSnapshot);
      pollingService.tryGetDeliveryCode.mockResolvedValue('delivery-code-123');

      const mockReq = { headers: {} } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      const result = await controller.pollTicket(
        'test-ticket',
        'session-123',
        mockReq,
        mockRes,
      );

      expect(result).toEqual({
        tid: 'test-ticket',
        status: 'APPROVED' as const,
        expiresAt: expect.any(String),
        grantReady: true,
        deliveryCode: 'delivery-code-123',
        nextPollAfterMs: 2000,
        version: 5,
      });
    });
  });

  describe('longPollTicket', () => {
    it('should return 400 if webSessionId is missing', async () => {
      const mockReq = { headers: {} } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      await expect(
        controller.longPollTicket('test-ticket', '', mockReq, mockRes),
      ).rejects.toThrow('webSessionId query parameter is required');
    });

    it('should return current snapshot if version has changed', async () => {
      const mockSnapshot = {
        status: 'SCANNED' as const,
        expiresAt: Date.now() + 300000,
        version: 6,
      };

      pollingService.readTicketSnapshot.mockResolvedValue(mockSnapshot);

      const mockReq = {
        headers: { 'if-none-match': 'W/"test-ticket:5"' },
      } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      const result = await controller.longPollTicket(
        'test-ticket',
        'session-123',
        mockReq,
        mockRes,
      );

      expect(result.status).toBe('SCANNED');
      expect(result.version).toBe(6);
    });

    it('should wait for changes if version has not changed', async () => {
      const mockSnapshot = {
        status: 'PENDING' as const,
        expiresAt: Date.now() + 300000,
        version: 5,
      };

      const updatedSnapshot = {
        status: 'SCANNED' as const,
        expiresAt: Date.now() + 300000,
        version: 6,
      };

      pollingService.readTicketSnapshot
        .mockResolvedValueOnce(mockSnapshot) // Initial check
        .mockResolvedValueOnce(updatedSnapshot); // After change

      pollingService.waitForChangeOrTimeout.mockResolvedValue('CHANGED');

      const mockReq = {
        headers: { 'if-none-match': 'W/"test-ticket:5"' },
      } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      const result = await controller.longPollTicket(
        'test-ticket',
        'session-123',
        mockReq,
        mockRes,
      );

      expect(result.status).toBe('SCANNED');
      expect(result.version).toBe(6);
      expect(pollingService.waitForChangeOrTimeout).toHaveBeenCalledWith({
        tid: 'test-ticket',
        sinceVersion: 5,
        timeoutMs: 25000,
      });
    });

    it('should return current snapshot on timeout', async () => {
      const mockSnapshot = {
        status: 'PENDING' as const,
        expiresAt: Date.now() + 300000,
        version: 5,
      };

      pollingService.readTicketSnapshot.mockResolvedValue(mockSnapshot);
      pollingService.waitForChangeOrTimeout.mockResolvedValue('TIMEOUT');

      const mockReq = {
        headers: { 'if-none-match': 'W/"test-ticket:5"' },
      } as any;
      const mockRes = { setHeader: jest.fn() } as any;

      const result = await controller.longPollTicket(
        'test-ticket',
        'session-123',
        mockReq,
        mockRes,
      );

      expect(result.status).toBe('PENDING');
      expect(result.version).toBe(5);
    });
  });
});
