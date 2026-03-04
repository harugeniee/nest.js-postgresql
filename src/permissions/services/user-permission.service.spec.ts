import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from 'src/shared/services';
import { PermissionEvaluator } from './permission-evaluator.service';
import { UserPermissionService } from './user-permission.service';

/**
 * Unit tests for UserPermissionService (cache lifecycle only)
 */
describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let logger: Logger;

  const mockPermissionEvaluator = {
    evaluate: jest.fn(),
    getEffectivePermissions: jest.fn(),
    invalidateCache: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPermissionService,
        { provide: PermissionEvaluator, useValue: mockPermissionEvaluator },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<UserPermissionService>(UserPermissionService);
    logger = service['logger'];

    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initUserPermissions', () => {
    it('should initialize user permissions in cache successfully', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 123n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      await service.initUserPermissions(userId, organizationId);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        '123',
        3600,
      );
    });

    it('should initialize without organization context', async () => {
      const userId = 'user-123';
      const effectivePermissions = {
        allowPermissions: 456n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      await service.initUserPermissions(userId);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, undefined, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        '456',
        3600,
      );
    });

    it('should throw error when initialization fails', async () => {
      const userId = 'user-123';
      const error = new Error('Database connection failed');
      mockPermissionEvaluator.getEffectivePermissions.mockRejectedValue(error);

      await expect(service.initUserPermissions(userId)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to init permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('refreshUserPermissions', () => {
    it('should refresh user permissions successfully', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 999n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      await service.refreshUserPermissions(userId, organizationId);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, 'organization', organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        '999',
        3600,
      );
    });

    it('should refresh without organization context', async () => {
      const userId = 'user-123';
      const effectivePermissions = {
        allowPermissions: 111n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      await service.refreshUserPermissions(userId);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith(userId, undefined, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        '111',
        3600,
      );
    });

    it('should throw error when refresh fails', async () => {
      const userId = 'user-123';
      const error = new Error('Database connection failed');
      mockPermissionEvaluator.getEffectivePermissions.mockRejectedValue(error);

      await expect(service.refreshUserPermissions(userId)).rejects.toThrow(
        error,
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('clearUserPermissions', () => {
    it('should clear user permissions from cache', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.clearUserPermissions(userId, organizationId);

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should clear without organization context', async () => {
      const userId = 'user-123';
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.clearUserPermissions(userId);

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });

    it('should handle cache deletion errors gracefully', async () => {
      const userId = 'user-123';
      const error = new Error('Cache service unavailable');
      mockCacheService.delete.mockRejectedValue(error);

      await service.clearUserPermissions(userId);

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to clear permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('batchRefreshPermissions', () => {
    it('should batch refresh permissions for multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const organizationId = 'org-456';
      const effectivePermissions = {
        allowPermissions: 100n,
        denyPermissions: 0n,
        permissions: {},
        permissionDetails: {},
      };

      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effectivePermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockPermissionEvaluator.invalidateCache.mockResolvedValue(undefined);

      await service.batchRefreshPermissions(userIds, organizationId);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledTimes(3);
      expect(mockCacheService.set).toHaveBeenCalledTimes(3);
    });

    it('should handle empty user list', async () => {
      await service.batchRefreshPermissions([]);

      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('isCached', () => {
    it('should return true when permissions are cached', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      mockCacheService.exists.mockResolvedValue(true);

      const result = await service.isCached(userId, organizationId);

      expect(result).toBe(true);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should return false when not cached', async () => {
      const userId = 'user-123';
      mockCacheService.exists.mockResolvedValue(false);

      const result = await service.isCached(userId);

      expect(result).toBe(false);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });
  });

  describe('Cache key generation', () => {
    it('should generate correct key with organization context', () => {
      const result = service['getCacheKey']('user-123', 'org-456');
      expect(result).toBe('user:permissions:user-123:org:org-456');
    });

    it('should generate correct key without organization context', () => {
      const result = service['getCacheKey']('user-123');
      expect(result).toBe('user:permissions:user-123');
    });
  });
});
