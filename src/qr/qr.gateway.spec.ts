import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { QrGateway } from './qr.gateway';
import { QrService } from './qr.service';
import { CacheService } from 'src/shared/services';

describe('QrGateway', () => {
  let gateway: QrGateway;
  let qrService: QrService;
  let jwtService: JwtService;
  let cacheService: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrGateway,
        {
          provide: QrService,
          useValue: {
            getTicket: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
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

    gateway = module.get<QrGateway>(QrGateway);
    qrService = module.get<QrService>(QrService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should extend BaseGateway', () => {
    expect(gateway).toBeInstanceOf(QrGateway);
    // Check if it has BaseGateway methods
    expect(typeof gateway.joinRoom).toBe('function');
    expect(typeof gateway.leaveRoom).toBe('function');
    expect(typeof gateway.broadcastToRoom).toBe('function');
  });

  it('should have required abstract methods implemented', () => {
    // Check if abstract methods are implemented
    expect(typeof gateway['extractClientMetadata']).toBe('function');
    expect(typeof gateway['sendConnectionConfirmation']).toBe('function');
    expect(typeof gateway['getUserId']).toBe('function');
  });

  it('should have connection hooks implemented', () => {
    // Check if connection hooks are implemented
    expect(typeof gateway['onAnonymousClientConnected']).toBe('function');
    expect(typeof gateway['onClientConnected']).toBe('function');
  });

  it('should have message handlers', () => {
    // Check if message handlers are implemented
    expect(typeof gateway['handleWaitQrApproval']).toBe('function');
    expect(typeof gateway['handleSubscribe']).toBe('function');
  });
});
