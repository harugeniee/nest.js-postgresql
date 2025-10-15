import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RateLimitContext } from 'src/common/interface';
import { COMMON_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services/cache/cache.service';
import {
  CreateApiKeyDto,
  CreateIpWhitelistDto,
  CreatePlanDto,
  UpdateApiKeyDto,
  UpdateIpWhitelistDto,
  UpdatePlanDto,
} from './dto';
import {
  CreateRateLimitPolicyDto,
  RateLimitScope,
  RateLimitStrategy,
  TestPolicyMatchDto,
  UpdateRateLimitPolicyDto,
} from './dto/rate-limit-policy.dto';
import { ApiKey } from './entities/api-key.entity';
import { IpWhitelist } from './entities/ip-whitelist.entity';
import { Plan } from './entities/plan.entity';
import { RateLimitPolicy } from './entities/rate-limit-policy.entity';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let plansRepo: Repository<Plan>;
  let apiKeyRepo: Repository<ApiKey>;
  let ipRepo: Repository<IpWhitelist>;
  let policyRepo: Repository<RateLimitPolicy>;
  let cacheService: CacheService;

  // Mock data
  const mockPlan: Plan = {
    id: '1234567890123456789',
    uuid: 'test-plan-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    name: 'free',
    limitPerMin: 100,
    ttlSec: 60,
    extra: {},
    description: 'Free plan',
    active: true,
    displayOrder: 1,
    apiKeys: [],
    logs: [],
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  const mockApiKey: ApiKey = {
    id: '1234567890123456789',
    uuid: 'test-apikey-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    key: 'test-api-key-123',
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    active: true,
    isWhitelist: false,
    name: 'Test API Key',
    userId: '1234567890123456789',
    user: null,
    planId: '1234567890123456789',
    plan: mockPlan,
    lastUsedAt: new Date(),
    expiresAt: null,
    isExpired: jest.fn().mockReturnValue(false),
    isValid: jest.fn().mockReturnValue(true),
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  const mockIpWhitelist: IpWhitelist = {
    id: '1234567890123456789',
    uuid: 'test-ip-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    ip: '192.168.1.1',
    description: 'Test IP',
    reason: 'Testing',
    active: true,
    isValid: jest.fn().mockReturnValue(true),
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  const mockPolicy: RateLimitPolicy = {
    id: '1234567890123456789',
    uuid: 'test-policy-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
    name: 'test-policy',
    active: true,
    status: COMMON_CONSTANTS.STATUS.ACTIVE,
    enabled: true,
    priority: 100,
    scope: 'global',
    routePattern: null,
    strategy: 'fixedWindow',
    limit: 50,
    windowSec: 60,
    burst: null,
    refillPerSec: null,
    extra: {},
    description: 'Test policy',
    isValid: jest.fn().mockReturnValue(true),
    matches: jest.fn().mockReturnValue(true),
    getEffectiveParams: jest.fn().mockReturnValue({
      strategy: 'fixedWindow',
      limit: 50,
      windowSec: 60,
    }),
    logs: [],
    generateId: jest.fn(),
    toJSON: jest.fn().mockReturnValue({}),
    isDeleted: jest.fn().mockReturnValue(false),
    getAge: jest.fn().mockReturnValue(1000000),
    getTimeSinceUpdate: jest.fn().mockReturnValue(500000),
  } as any;

  const mockContext: RateLimitContext = {
    ip: '192.168.1.100',
    routeKey: 'POST:/api/v1/test',
    apiKey: 'test-api-key-123',
    userId: '1234567890123456789',
    orgId: '1234567890123456789',
  };

  // Mock repositories
  const mockPlansRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockApiKeyRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockIpRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPolicyRepo = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  // Mock cache service
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getTtl: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    countKeysByPattern: jest.fn(),
    getRedisClient: jest.fn().mockReturnValue({
      eval: jest.fn(),
      publish: jest.fn(),
      duplicate: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
        on: jest.fn(),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: getRepositoryToken(Plan),
          useValue: mockPlansRepo,
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepo,
        },
        {
          provide: getRepositoryToken(IpWhitelist),
          useValue: mockIpRepo,
        },
        {
          provide: getRepositoryToken(RateLimitPolicy),
          useValue: mockPolicyRepo,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    plansRepo = module.get<Repository<Plan>>(getRepositoryToken(Plan));
    apiKeyRepo = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    ipRepo = module.get<Repository<IpWhitelist>>(
      getRepositoryToken(IpWhitelist),
    );
    policyRepo = module.get<Repository<RateLimitPolicy>>(
      getRepositoryToken(RateLimitPolicy),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize data when no plans exist', async () => {
      // Arrange
      mockPlansRepo.count.mockResolvedValue(0);
      mockIpRepo.count.mockResolvedValue(0);
      mockPolicyRepo.count.mockResolvedValue(0);
      mockPlansRepo.create.mockReturnValue([mockPlan]);
      mockPlansRepo.save.mockResolvedValue([mockPlan]);
      mockIpRepo.create.mockReturnValue([mockIpWhitelist]);
      mockIpRepo.save.mockResolvedValue([mockIpWhitelist]);
      mockPolicyRepo.create.mockReturnValue([mockPolicy]);
      mockPolicyRepo.save.mockResolvedValue([mockPolicy]);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPlansRepo.count).toHaveBeenCalled();
      expect(mockPlansRepo.create).toHaveBeenCalled();
      expect(mockPlansRepo.save).toHaveBeenCalled();
      expect(mockIpRepo.create).toHaveBeenCalled();
      expect(mockIpRepo.save).toHaveBeenCalled();
      expect(mockPolicyRepo.create).toHaveBeenCalled();
      expect(mockPolicyRepo.save).toHaveBeenCalled();
    });

    it('should skip initialization when plans already exist', async () => {
      // Arrange
      mockPlansRepo.count.mockResolvedValue(5);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPlansRepo.count).toHaveBeenCalled();
      expect(mockPlansRepo.create).not.toHaveBeenCalled();
      expect(mockPlansRepo.save).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      mockPlansRepo.count.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Database error');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request for whitelisted IP', async () => {
      // Arrange
      jest.spyOn(service as any, 'isIpWhitelisted').mockResolvedValue(true);

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result).toEqual({
        allowed: true,
        headers: { 'X-RateLimit-Status': 'whitelisted' },
      });
    });

    it('should use anonymous plan for invalid API key', async () => {
      // Arrange
      jest.spyOn(service as any, 'isIpWhitelisted').mockResolvedValue(false);
      jest
        .spyOn(service as any, 'resolveApiKey')
        .mockResolvedValue({ kind: 'invalid' });
      jest.spyOn(service as any, 'applyRateLimit').mockResolvedValue({
        allowed: true,
        headers: { 'X-RateLimit-Limit': '5' },
      });

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result.allowed).toBe(true);
      expect((service as any).applyRateLimit).toHaveBeenCalledWith(
        'anonymous',
        mockContext,
      );
    });

    it('should allow request for whitelisted API key', async () => {
      // Arrange
      jest.spyOn(service as any, 'isIpWhitelisted').mockResolvedValue(false);
      jest.spyOn(service as any, 'resolveApiKey').mockResolvedValue({
        kind: 'apiKey',
        isWhitelist: true,
      });

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result).toEqual({
        allowed: true,
        headers: { 'X-RateLimit-Status': 'api-key-whitelisted' },
      });
    });

    it('should apply policy rate limit when matching policy found', async () => {
      // Arrange
      jest.spyOn(service as any, 'isIpWhitelisted').mockResolvedValue(false);
      jest.spyOn(service as any, 'resolveApiKey').mockResolvedValue({
        kind: 'apiKey',
        plan: 'free',
      });
      jest
        .spyOn(service as any, 'findMatchingPolicy')
        .mockResolvedValue(mockPolicy);
      jest.spyOn(service as any, 'applyPolicyRateLimit').mockResolvedValue({
        allowed: true,
        headers: { 'X-RateLimit-Policy': 'test-policy' },
      });

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result.allowed).toBe(true);
      expect((service as any).applyPolicyRateLimit).toHaveBeenCalledWith(
        mockPolicy,
        mockContext,
      );
    });

    it('should apply plan rate limit when no matching policy', async () => {
      // Arrange
      jest.spyOn(service as any, 'isIpWhitelisted').mockResolvedValue(false);
      jest.spyOn(service as any, 'resolveApiKey').mockResolvedValue({
        kind: 'apiKey',
        plan: 'free',
      });
      jest.spyOn(service as any, 'findMatchingPolicy').mockResolvedValue(null);
      jest.spyOn(service as any, 'applyRateLimit').mockResolvedValue({
        allowed: true,
        headers: { 'X-RateLimit-Plan': 'free' },
      });

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result.allowed).toBe(true);
      expect((service as any).applyRateLimit).toHaveBeenCalledWith(
        'free',
        mockContext,
      );
    });

    it('should handle errors gracefully and allow request', async () => {
      // Arrange
      jest
        .spyOn(service as any, 'isIpWhitelisted')
        .mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.checkRateLimit(mockContext);

      // Assert
      expect(result).toEqual({
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      });
    });
  });

  describe('applyRateLimit', () => {
    it('should apply rate limit successfully', async () => {
      // Arrange
      const planName = 'free';
      const context = mockContext;
      jest.spyOn(service as any, 'getPlan').mockResolvedValue(mockPlan);
      jest
        .spyOn(service as any, 'generateRateLimitKey')
        .mockReturnValue(
          'rl:free:192.168.1.100:POST:/api/v1/test:test-api-key-123:1234567890123456789:1234567890123456789',
        );

      const mockRedisEval = jest.fn().mockResolvedValue([1, 5, 60]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyRateLimit(planName, context);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty('X-RateLimit-Limit', '100');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining', '95');
      expect(result.headers).toHaveProperty('X-RateLimit-Plan', 'free');
    });

    it('should deny request when rate limit exceeded', async () => {
      // Arrange
      const planName = 'free';
      const context = mockContext;
      jest.spyOn(service as any, 'getPlan').mockResolvedValue(mockPlan);
      jest
        .spyOn(service as any, 'generateRateLimitKey')
        .mockReturnValue(
          'rl:free:192.168.1.100:POST:/api/v1/test:test-api-key-123:1234567890123456789:1234567890123456789',
        );

      const mockRedisEval = jest.fn().mockResolvedValue([0, 100, 60]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyRateLimit(planName, context);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.headers).toHaveProperty('Retry-After', '60');
      expect(result.retryAfter).toBe(60);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const planName = 'free';
      const context = mockContext;
      jest
        .spyOn(service as any, 'getPlan')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await (service as any).applyRateLimit(planName, context);

      // Assert
      expect(result).toEqual({
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      });
    });
  });

  describe('getPlan', () => {
    it('should return cached plan', async () => {
      // Arrange
      const planName = 'free';
      mockCacheService.get.mockResolvedValue(mockPlan);

      // Act
      const result = await (service as any).getPlan(planName);

      // Assert
      expect(result).toBe(mockPlan);
      expect(mockCacheService.get).toHaveBeenCalledWith(`rl:plan:${planName}`);
      expect(mockPlansRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch plan from database and cache it', async () => {
      // Arrange
      const planName = 'free';
      mockCacheService.get.mockResolvedValue(null);
      mockPlansRepo.findOne.mockResolvedValue(mockPlan);

      // Act
      const result = await (service as any).getPlan(planName);

      // Assert
      expect(result).toBe(mockPlan);
      expect(mockPlansRepo.findOne).toHaveBeenCalledWith({
        where: { name: planName, active: true },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rl:plan:${planName}`,
        mockPlan,
        300,
      );
    });

    it('should return default anonymous plan when not found', async () => {
      // Arrange
      const planName = 'anonymous';
      mockCacheService.get.mockResolvedValue(null);
      mockPlansRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await (service as any).getPlan(planName);

      // Assert
      expect(result).toEqual({
        name: 'anonymous',
        limitPerMin: 5,
        ttlSec: 60,
        active: true,
        displayOrder: 1,
        description: 'Dummy plan for anonymous users',
      });
    });

    it('should fallback to anonymous plan for unknown plan', async () => {
      // Arrange
      const planName = 'unknown';
      mockCacheService.get.mockResolvedValue(null);
      mockPlansRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await (service as any).getPlan(planName);

      // Assert
      expect(result).toEqual({
        name: 'anonymous',
        limitPerMin: 5,
        ttlSec: 60,
        active: true,
        displayOrder: 1,
        description: 'Dummy plan for anonymous users',
      });
    });
  });

  describe('resolveApiKey', () => {
    it('should return anonymous for empty API key', async () => {
      // Act
      const result = await (service as any).resolveApiKey('');

      // Assert
      expect(result).toEqual({ kind: 'anonymous' });
    });

    it('should return anonymous for null API key', async () => {
      // Act
      const result = await (service as any).resolveApiKey(null);

      // Assert
      expect(result).toEqual({ kind: 'anonymous' });
    });

    it('should return cached API key resolution', async () => {
      // Arrange
      const apiKey = 'test-api-key-123';
      const cachedResult = { kind: 'apiKey', plan: 'free', isWhitelist: false };
      mockCacheService.get.mockResolvedValue(cachedResult);

      // Act
      const result = await (service as any).resolveApiKey(apiKey);

      // Assert
      expect(result).toBe(cachedResult);
      expect(mockCacheService.get).toHaveBeenCalledWith(`rl:apikey:${apiKey}`);
    });

    it('should resolve API key from database and cache it', async () => {
      // Arrange
      const apiKey = 'test-api-key-123';
      mockCacheService.get.mockResolvedValue(null);
      mockApiKeyRepo.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await (service as any).resolveApiKey(apiKey);

      // Assert
      expect(result).toEqual({
        kind: 'apiKey',
        plan: 'free',
        isWhitelist: false,
      });
      expect(mockApiKeyRepo.findOne).toHaveBeenCalledWith({
        where: { key: apiKey, active: true },
        select: ['id', 'plan', 'isWhitelist', 'expiresAt', 'deletedAt'],
        relations: ['plan'],
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rl:apikey:${apiKey}`,
        expect.any(Object),
        300,
      );
    });

    it('should return invalid for expired API key', async () => {
      // Arrange
      const apiKey = 'test-api-key-123';
      const expiredApiKey = {
        ...mockApiKey,
        isExpired: jest.fn().mockReturnValue(true),
      };
      mockCacheService.get.mockResolvedValue(null);
      mockApiKeyRepo.findOne.mockResolvedValue(expiredApiKey);

      // Act
      const result = await (service as any).resolveApiKey(apiKey);

      // Assert
      expect(result).toEqual({ kind: 'invalid' });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rl:apikey:${apiKey}`,
        { kind: 'invalid' },
        60,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const apiKey = 'test-api-key-123';
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await (service as any).resolveApiKey(apiKey);

      // Assert
      expect(result).toEqual({ kind: 'invalid' });
    });
  });

  describe('isIpWhitelisted', () => {
    it('should return false for empty IP', async () => {
      // Act
      const result = await (service as any).isIpWhitelisted('');

      // Assert
      expect(result).toBe(false);
    });

    it('should return cached result', async () => {
      // Arrange
      const ip = '192.168.1.1';
      mockCacheService.get.mockResolvedValue(true);

      // Act
      const result = await (service as any).isIpWhitelisted(ip);

      // Assert
      expect(result).toBe(true);
      expect(mockCacheService.get).toHaveBeenCalledWith(`rl:ipwl:${ip}`);
    });

    it('should check database and cache result', async () => {
      // Arrange
      const ip = '192.168.1.1';
      mockCacheService.get.mockResolvedValue(null);
      mockIpRepo.findOne.mockResolvedValue(mockIpWhitelist);

      // Act
      const result = await (service as any).isIpWhitelisted(ip);

      // Assert
      expect(result).toBe(true);
      expect(mockIpRepo.findOne).toHaveBeenCalledWith({
        where: { ip, active: true },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rl:ipwl:${ip}`,
        true,
        300,
      );
    });

    it('should return false when IP not found', async () => {
      // Arrange
      const ip = '192.168.1.1';
      mockCacheService.get.mockResolvedValue(null);
      mockIpRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await (service as any).isIpWhitelisted(ip);

      // Assert
      expect(result).toBe(false);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rl:ipwl:${ip}`,
        false,
        300,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const ip = '192.168.1.1';
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await (service as any).isIpWhitelisted(ip);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findMatchingPolicy', () => {
    it('should return cached policies and find match', async () => {
      // Arrange
      const context = mockContext;
      mockCacheService.get.mockResolvedValue([mockPolicy]);
      (mockPolicy.matches as jest.Mock).mockReturnValue(true);

      // Act
      const result = await (service as any).findMatchingPolicy(context);

      // Assert
      expect(result).toBe(mockPolicy);
      expect(mockCacheService.get).toHaveBeenCalledWith('rl:policies:active');
      expect(mockPolicy.matches).toHaveBeenCalledWith(context);
    });

    it('should fetch policies from database and cache them', async () => {
      // Arrange
      const context = mockContext;
      mockCacheService.get.mockResolvedValue(null);
      mockPolicyRepo.find.mockResolvedValue([mockPolicy]);
      (mockPolicy.matches as jest.Mock).mockReturnValue(true);

      // Act
      const result = await (service as any).findMatchingPolicy(context);

      // Assert
      expect(result).toBe(mockPolicy);
      expect(mockPolicyRepo.find).toHaveBeenCalledWith({
        where: { enabled: true, status: COMMON_CONSTANTS.STATUS.ACTIVE },
        order: { priority: 'DESC' },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rl:policies:active',
        [mockPolicy],
        300,
      );
    });

    it('should return null when no policy matches', async () => {
      // Arrange
      const context = mockContext;
      mockCacheService.get.mockResolvedValue([mockPolicy]);
      (mockPolicy.matches as jest.Mock).mockReturnValue(false);

      // Act
      const result = await (service as any).findMatchingPolicy(context);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const context = mockContext;
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await (service as any).findMatchingPolicy(context);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('applyPolicyRateLimit', () => {
    it('should apply fixed window policy rate limit', async () => {
      // Arrange
      const policy = {
        ...mockPolicy,
        strategy: 'fixedWindow',
        getEffectiveParams: jest.fn().mockReturnValue({
          strategy: 'fixedWindow',
          limit: 50,
          windowSec: 60,
        }),
      };
      const context = mockContext;

      const mockRedisEval = jest.fn().mockResolvedValue([1, 10, 60]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyPolicyRateLimit(
        policy,
        context,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty(
        'X-RateLimit-Policy',
        'test-policy',
      );
      expect(result.headers).toHaveProperty(
        'X-RateLimit-Strategy',
        'fixedWindow',
      );
    });

    it('should apply sliding window policy rate limit', async () => {
      // Arrange
      const policy = {
        ...mockPolicy,
        strategy: 'slidingWindow',
        getEffectiveParams: jest.fn().mockReturnValue({
          strategy: 'slidingWindow',
          limit: 30,
          windowSec: 60,
        }),
      };
      const context = mockContext;

      const mockRedisEval = jest.fn().mockResolvedValue([1, 5, 60]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyPolicyRateLimit(
        policy,
        context,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty(
        'X-RateLimit-Strategy',
        'slidingWindow',
      );
    });

    it('should apply token bucket policy rate limit', async () => {
      // Arrange
      const policy = {
        ...mockPolicy,
        strategy: 'tokenBucket',
        getEffectiveParams: jest.fn().mockReturnValue({
          strategy: 'tokenBucket',
          burst: 20,
          refillPerSec: 5,
        }),
      };
      const context = mockContext;

      const mockRedisEval = jest.fn().mockResolvedValue([1, 15, 1]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyPolicyRateLimit(
        policy,
        context,
      );

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty(
        'X-RateLimit-Strategy',
        'tokenBucket',
      );
    });

    it('should deny request when policy rate limit exceeded', async () => {
      // Arrange
      const policy = {
        ...mockPolicy,
        getEffectiveParams: jest.fn().mockReturnValue({
          strategy: 'fixedWindow',
          limit: 50,
          windowSec: 60,
        }),
      };
      const context = mockContext;

      const mockRedisEval = jest.fn().mockResolvedValue([0, 50, 60]);
      mockCacheService.getRedisClient().eval = mockRedisEval;

      // Act
      const result = await (service as any).applyPolicyRateLimit(
        policy,
        context,
      );

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.headers).toHaveProperty('Retry-After', '60');
      expect(result.retryAfter).toBe(60);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const policy = {
        ...mockPolicy,
        getEffectiveParams: jest.fn().mockImplementation(() => {
          throw new Error('Policy error');
        }),
      };
      const context = mockContext;

      // Act
      const result = await (service as any).applyPolicyRateLimit(
        policy,
        context,
      );

      // Assert
      expect(result).toEqual({
        allowed: true,
        headers: { 'X-RateLimit-Status': 'error-fallback' },
      });
    });
  });

  describe('generateRateLimitKey', () => {
    it('should generate correct rate limit key', () => {
      // Arrange
      const planName = 'free';
      const context = mockContext;

      // Act
      const result = (service as any).generateRateLimitKey(planName, context);

      // Assert
      expect(result).toBe(
        'rl:free:192.168.1.100:POST:/api/v1/test:test-api-key-123:1234567890123456789:1234567890123456789',
      );
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const planName = 'free';
      const context = {
        ip: '192.168.1.100',
        routeKey: 'POST:/api/v1/test',
        // Missing apiKey, userId, orgId
      };

      // Act
      const result = (service as any).generateRateLimitKey(planName, context);

      // Assert
      expect(result).toBe(
        'rl:free:192.168.1.100:POST:/api/v1/test:no-key:anon:noorg',
      );
    });
  });

  describe('generatePolicyRateLimitKey', () => {
    it('should generate global policy key', () => {
      // Arrange
      const policy = { ...mockPolicy, scope: 'global' };
      const context = mockContext;

      // Act
      const result = (service as any).generatePolicyRateLimitKey(
        policy,
        context,
      );

      // Assert
      expect(result).toBe('rl:policy:test-policy:global');
    });

    it('should generate route policy key', () => {
      // Arrange
      const policy = { ...mockPolicy, scope: 'route' };
      const context = mockContext;

      // Act
      const result = (service as any).generatePolicyRateLimitKey(
        policy,
        context,
      );

      // Assert
      expect(result).toBe('rl:policy:test-policy:route:POST:/api/v1/test');
    });

    it('should generate user policy key', () => {
      // Arrange
      const policy = { ...mockPolicy, scope: 'user' };
      const context = mockContext;

      // Act
      const result = (service as any).generatePolicyRateLimitKey(
        policy,
        context,
      );

      // Assert
      expect(result).toBe('rl:policy:test-policy:user:1234567890123456789');
    });

    it('should generate org policy key', () => {
      // Arrange
      const policy = { ...mockPolicy, scope: 'org' };
      const context = mockContext;

      // Act
      const result = (service as any).generatePolicyRateLimitKey(
        policy,
        context,
      );

      // Assert
      expect(result).toBe('rl:policy:test-policy:org:1234567890123456789');
    });

    it('should generate IP policy key', () => {
      // Arrange
      const policy = { ...mockPolicy, scope: 'ip' };
      const context = mockContext;

      // Act
      const result = (service as any).generatePolicyRateLimitKey(
        policy,
        context,
      );

      // Assert
      expect(result).toBe('rl:policy:test-policy:ip:192.168.1.100');
    });
  });

  describe('publishCacheInvalidation', () => {
    it('should publish cache invalidation message', async () => {
      // Arrange
      const mockPublish = jest.fn().mockResolvedValue(undefined);
      mockCacheService.getRedisClient().publish = mockPublish;

      // Act
      await service.publishCacheInvalidation();

      // Assert
      expect(mockPublish).toHaveBeenCalledWith(
        'ratelimit:invalidate',
        expect.stringContaining('timestamp'),
      );
    });

    it('should handle publish errors gracefully', async () => {
      // Arrange
      const mockPublish = jest.fn().mockRejectedValue(new Error('Redis error'));
      mockCacheService.getRedisClient().publish = mockPublish;

      // Act
      await service.publishCacheInvalidation();

      // Assert
      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      // Arrange
      mockCacheService.countKeysByPattern
        .mockResolvedValueOnce(5) // planCount
        .mockResolvedValueOnce(10) // ipWhitelistCount
        .mockResolvedValueOnce(15) // apiKeyCount
        .mockResolvedValueOnce(3); // policyCount

      // Act
      const result = await service.getCacheStats();

      // Assert
      expect(result).toEqual({
        planCount: 5,
        ipWhitelistCount: 10,
        apiKeyCount: 15,
        policyCount: 3,
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockCacheService.countKeysByPattern.mockRejectedValue(
        new Error('Cache error'),
      );

      // Act
      const result = await service.getCacheStats();

      // Assert
      expect(result).toEqual({
        planCount: 0,
        ipWhitelistCount: 0,
        apiKeyCount: 0,
        policyCount: 0,
      });
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific key', async () => {
      // Arrange
      const key = 'rl:free:192.168.1.100';
      mockCacheService.deleteKeysByPattern.mockResolvedValue(5);

      // Act
      await service.resetRateLimit(key);

      // Assert
      expect(mockCacheService.deleteKeysByPattern).toHaveBeenCalledWith(
        'rl:free:*',
      );
    });

    it('should handle simple key pattern', async () => {
      // Arrange
      const key = 'simple-key';
      mockCacheService.deleteKeysByPattern.mockResolvedValue(2);

      // Act
      await service.resetRateLimit(key);

      // Assert
      expect(mockCacheService.deleteKeysByPattern).toHaveBeenCalledWith(
        'simple-key*',
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const key = 'test-key';
      mockCacheService.deleteKeysByPattern.mockRejectedValue(
        new Error('Cache error'),
      );

      // Act
      await service.resetRateLimit(key);

      // Assert
      expect(mockCacheService.deleteKeysByPattern).toHaveBeenCalled();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info for existing key', async () => {
      // Arrange
      const key = 'rl:free:192.168.1.100';
      mockCacheService.exists.mockResolvedValue(true);
      mockCacheService.getTtl.mockResolvedValue(45);
      mockCacheService.get.mockResolvedValue('25');

      // Act
      const result = await service.getRateLimitInfo(key);

      // Assert
      expect(result).toEqual({
        current: 25,
        limit: 0,
        resetTime: expect.any(Number),
      });
    });

    it('should return zero info for non-existing key', async () => {
      // Arrange
      const key = 'rl:free:192.168.1.100';
      mockCacheService.exists.mockResolvedValue(false);

      // Act
      const result = await service.getRateLimitInfo(key);

      // Assert
      expect(result).toEqual({
        current: 0,
        limit: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const key = 'test-key';
      mockCacheService.exists.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getRateLimitInfo(key);

      // Assert
      expect(result).toEqual({
        current: 0,
        limit: 0,
      });
    });
  });

  describe('CRUD Operations', () => {
    describe('Plans', () => {
      it('should get all plans', async () => {
        // Arrange
        mockPlansRepo.find.mockResolvedValue([mockPlan]);

        // Act
        const result = await service.getAllPlans();

        // Assert
        expect(result).toEqual([mockPlan]);
        expect(mockPlansRepo.find).toHaveBeenCalledWith({
          where: { active: true },
          order: { displayOrder: 'ASC' },
        });
      });

      it('should create plan', async () => {
        // Arrange
        const planData: CreatePlanDto = {
          name: 'premium',
          limitPerMin: 1000,
          ttlSec: 60,
          description: 'Premium plan',
          active: true,
          displayOrder: 3,
        };
        mockPlansRepo.create.mockReturnValue(mockPlan);
        mockPlansRepo.save.mockResolvedValue(mockPlan);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.createPlan(planData);

        // Assert
        expect(result).toBe(mockPlan);
        expect(mockPlansRepo.create).toHaveBeenCalledWith(planData);
        expect(mockPlansRepo.save).toHaveBeenCalledWith(mockPlan);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should update plan', async () => {
        // Arrange
        const planName = 'free';
        const updateData: UpdatePlanDto = {
          limitPerMin: 200,
          description: 'Updated free plan',
        };
        mockPlansRepo.update.mockResolvedValue({ affected: 1 });
        mockPlansRepo.findOne.mockResolvedValue(mockPlan);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.updatePlan(planName, updateData);

        // Assert
        expect(result).toBe(mockPlan);
        expect(mockPlansRepo.update).toHaveBeenCalledWith(planName, updateData);
        expect(mockPlansRepo.findOne).toHaveBeenCalledWith({
          where: { name: planName },
        });
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });
    });

    describe('API Keys', () => {
      it('should get all API keys', async () => {
        // Arrange
        mockApiKeyRepo.find.mockResolvedValue([mockApiKey]);

        // Act
        const result = await service.getAllApiKeys();

        // Assert
        expect(result).toEqual([mockApiKey]);
        expect(mockApiKeyRepo.find).toHaveBeenCalledWith({
          where: { active: true },
          order: { createdAt: 'DESC' },
        });
      });

      it('should create API key', async () => {
        // Arrange
        const keyData: CreateApiKeyDto = {
          key: 'new-api-key',
          planId: '1234567890123456789',
          name: 'New API Key',
          isWhitelist: false,
        };
        mockApiKeyRepo.create.mockReturnValue(mockApiKey);
        mockApiKeyRepo.save.mockResolvedValue(mockApiKey);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.createApiKey(keyData);

        // Assert
        expect(result).toBe(mockApiKey);
        expect(mockApiKeyRepo.create).toHaveBeenCalledWith({
          ...keyData,
          planId: keyData.planId,
        });
        expect(mockApiKeyRepo.save).toHaveBeenCalledWith(mockApiKey);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should update API key', async () => {
        // Arrange
        const id = '1234567890123456789';
        const updateData: UpdateApiKeyDto = {
          name: 'Updated API Key',
          isWhitelist: true,
        };
        mockApiKeyRepo.update.mockResolvedValue({ affected: 1 });
        mockApiKeyRepo.findOne.mockResolvedValue(mockApiKey);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.updateApiKey(id, updateData);

        // Assert
        expect(result).toBe(mockApiKey);
        expect(mockApiKeyRepo.update).toHaveBeenCalledWith(id, updateData);
        expect(mockApiKeyRepo.findOne).toHaveBeenCalledWith({ where: { id } });
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should delete API key', async () => {
        // Arrange
        const id = '1234567890123456789';
        mockApiKeyRepo.softDelete.mockResolvedValue({ affected: 1 });
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        await service.deleteApiKey(id);

        // Assert
        expect(mockApiKeyRepo.softDelete).toHaveBeenCalledWith(id);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });
    });

    describe('IP Whitelist', () => {
      it('should get all IP whitelist entries', async () => {
        // Arrange
        mockIpRepo.find.mockResolvedValue([mockIpWhitelist]);

        // Act
        const result = await service.getAllIpWhitelist();

        // Assert
        expect(result).toEqual([mockIpWhitelist]);
        expect(mockIpRepo.find).toHaveBeenCalledWith({
          where: { active: true },
          order: { createdAt: 'DESC' },
        });
      });

      it('should add IP to whitelist', async () => {
        // Arrange
        const ipData: CreateIpWhitelistDto = {
          ip: '192.168.1.50',
          description: 'Test IP',
          reason: 'Testing',
        };
        mockIpRepo.create.mockReturnValue(mockIpWhitelist);
        mockIpRepo.save.mockResolvedValue(mockIpWhitelist);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.addIpToWhitelist(ipData);

        // Assert
        expect(result).toBe(mockIpWhitelist);
        expect(mockIpRepo.create).toHaveBeenCalledWith(ipData);
        expect(mockIpRepo.save).toHaveBeenCalledWith(mockIpWhitelist);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should update IP whitelist entry', async () => {
        // Arrange
        const id = '1234567890123456789';
        const updateData: UpdateIpWhitelistDto = {
          description: 'Updated description',
        };
        mockIpRepo.update.mockResolvedValue({ affected: 1 });
        mockIpRepo.findOne.mockResolvedValue(mockIpWhitelist);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.updateIpWhitelist(id, updateData);

        // Assert
        expect(result).toBe(mockIpWhitelist);
        expect(mockIpRepo.update).toHaveBeenCalledWith(id, updateData);
        expect(mockIpRepo.findOne).toHaveBeenCalledWith({ where: { id } });
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should remove IP from whitelist', async () => {
        // Arrange
        const id = '1234567890123456789';
        mockIpRepo.softDelete.mockResolvedValue({ affected: 1 });
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        await service.removeIpFromWhitelist(id);

        // Assert
        expect(mockIpRepo.softDelete).toHaveBeenCalledWith(id);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });
    });

    describe('Policies', () => {
      it('should get all policies', async () => {
        // Arrange
        mockPolicyRepo.find.mockResolvedValue([mockPolicy]);

        // Act
        const result = await service.getAllPolicies();

        // Assert
        expect(result).toEqual([mockPolicy]);
        expect(mockPolicyRepo.find).toHaveBeenCalledWith({
          where: { enabled: true },
          order: { priority: 'DESC' },
        });
      });

      it('should create policy', async () => {
        // Arrange
        const policyData: CreateRateLimitPolicyDto = {
          name: 'new-policy',
          scope: RateLimitScope.ROUTE,
          strategy: RateLimitStrategy.FIXED_WINDOW,
          limit: 100,
          windowSec: 60,
          enabled: true,
          priority: 50,
        };
        mockPolicyRepo.create.mockReturnValue(mockPolicy);
        mockPolicyRepo.save.mockResolvedValue(mockPolicy);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.createPolicy(policyData);

        // Assert
        expect(result).toBe(mockPolicy);
        expect(mockPolicyRepo.create).toHaveBeenCalledWith(policyData);
        expect(mockPolicyRepo.save).toHaveBeenCalledWith(mockPolicy);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should update policy', async () => {
        // Arrange
        const id = '1234567890123456789';
        const updateData: UpdateRateLimitPolicyDto = {
          limit: 200,
          description: 'Updated policy',
        };
        mockPolicyRepo.update.mockResolvedValue({ affected: 1 });
        mockPolicyRepo.findOne.mockResolvedValue(mockPolicy);
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        const result = await service.updatePolicy(id, updateData);

        // Assert
        expect(result).toBe(mockPolicy);
        expect(mockPolicyRepo.update).toHaveBeenCalledWith(id, updateData);
        expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({ where: { id } });
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should delete policy', async () => {
        // Arrange
        const id = '1234567890123456789';
        mockPolicyRepo.softDelete.mockResolvedValue({ affected: 1 });
        jest.spyOn(service, 'publishCacheInvalidation').mockResolvedValue();

        // Act
        await service.deletePolicy(id);

        // Assert
        expect(mockPolicyRepo.softDelete).toHaveBeenCalledWith(id);
        expect(service.publishCacheInvalidation).toHaveBeenCalled();
      });

      it('should get policy by name', async () => {
        // Arrange
        const name = 'test-policy';
        mockPolicyRepo.findOne.mockResolvedValue(mockPolicy);

        // Act
        const result = await service.getPolicyByName(name);

        // Assert
        expect(result).toBe(mockPolicy);
        expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({
          where: { name },
        });
      });

      it('should test policy match', async () => {
        // Arrange
        const policyId = '1234567890123456789';
        const context: TestPolicyMatchDto = {
          userId: '1234567890123456789',
          orgId: '1234567890123456789',
          ip: '192.168.1.100',
          routeKey: 'POST:/api/v1/test',
        };
        mockPolicyRepo.findOne.mockResolvedValue(mockPolicy);
        (mockPolicy.matches as jest.Mock).mockReturnValue(true);

        // Act
        const result = await service.testPolicyMatch(policyId, context);

        // Assert
        expect(result).toEqual({
          matches: true,
          policy: mockPolicy,
        });
        expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({
          where: { id: policyId },
        });
        expect(mockPolicy.matches).toHaveBeenCalledWith(context);
      });

      it('should return no match for non-existent policy', async () => {
        // Arrange
        const policyId = '1234567890123456789';
        const context: TestPolicyMatchDto = {
          userId: '1234567890123456789',
          orgId: '1234567890123456789',
          ip: '192.168.1.100',
          routeKey: 'POST:/api/v1/test',
        };
        mockPolicyRepo.findOne.mockResolvedValue(null);

        // Act
        const result = await service.testPolicyMatch(policyId, context);

        // Assert
        expect(result).toEqual({
          matches: false,
          policy: null,
        });
      });
    });
  });
});
