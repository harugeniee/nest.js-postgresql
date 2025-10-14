import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionName } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { PERMISSIONS } from '../constants/permissions.constants';
import { PermissionsService } from '../permissions.service';
import { UserPermissionService } from './user-permission.service';

/**
 * Unit tests for UserPermissionService
 * Tests high-performance permission caching with Redis
 */
describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let permissionsService: PermissionsService;
  let cacheService: CacheService;
  let logger: Logger;

  // Mock PermissionsService
  const mockPermissionsService = {
    getUserPermissionsBitfield: jest.fn(),
  };

  // Mock CacheService
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
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UserPermissionService>(UserPermissionService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    cacheService = module.get<CacheService>(CacheService);
    logger = service['logger'];

    // Mock the logger methods
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initUserPermissions', () => {
    it('should initialize user permissions in cache successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Spy on logger to verify logging

      // Act
      await service.initUserPermissions(userId, organizationId);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        userPermissions.toString(),
        3600, // CACHE_TTL
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Initializing permissions for user ${userId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Cached permissions for user ${userId}: ${userPermissions.toString()}`,
      );
    });

    it('should initialize user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      await service.initUserPermissions(userId);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        userPermissions.toString(),
        3600,
      );
    });

    it('should throw error when initialization fails', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Database connection failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act & Assert
      await expect(service.initUserPermissions(userId)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to init permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return cached permissions when available', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const cachedPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockCacheService.get.mockResolvedValue(cachedPermissions.toString());

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(cachedPermissions);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).not.toHaveBeenCalled();
    });

    it('should load from database and cache when cache miss', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Spy on logger to verify warning

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(userPermissions);
      expect(logger.warn).toHaveBeenCalledWith(
        `Cache miss for user ${userId}, loading from database`,
      );
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        userPermissions.toString(),
        3600,
      );
    });

    it('should return 0n when error occurs', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache service unavailable');

      mockCacheService.get.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBe(0n);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to get permissions for user ${userId}`,
        error,
      );
    });

    it('should handle organization context in cache key', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act
      await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should handle global context in cache key', async () => {
      // Arrange
      const userId = 'user-123';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act
      await service.getUserPermissions(userId);

      // Assert
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'ARTICLE_CREATE';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act
      const result = await service.hasPermission(
        userId,
        permission,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'ADMINISTRATOR';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkPermissions', () => {
    it('should check complex permission logic', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const options = {
        all: ['ARTICLE_CREATE'] as PermissionName[],
        any: ['ARTICLE_EDIT', 'ARTICLE_DELETE'] as PermissionName[],
        none: ['ADMINISTRATOR'] as PermissionName[],
      };
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act
      const result = await service.checkPermissions(
        userId,
        options,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('refreshUserPermissions', () => {
    it('should refresh user permissions successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Spy on logger to verify logging

      // Act
      await service.refreshUserPermissions(userId, organizationId);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
        userPermissions.toString(),
        3600,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Refreshing permissions for user ${userId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Refreshed permissions for user ${userId}: ${userPermissions.toString()}`,
      );
    });

    it('should refresh user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      await service.refreshUserPermissions(userId);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        userPermissions.toString(),
        3600,
      );
    });

    it('should throw error when refresh fails', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Database connection failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act & Assert
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
    it('should clear user permissions from cache successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockCacheService.delete.mockResolvedValue(undefined);

      // Spy on logger to verify logging

      // Act
      await service.clearUserPermissions(userId, organizationId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Cleared permissions cache for user ${userId}`,
      );
    });

    it('should clear user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';

      mockCacheService.delete.mockResolvedValue(undefined);

      // Act
      await service.clearUserPermissions(userId);

      // Assert
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });

    it('should handle cache deletion errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache service unavailable');

      mockCacheService.delete.mockRejectedValue(error);

      // Spy on logger to verify error logging

      // Act
      await service.clearUserPermissions(userId);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to clear permissions for user ${userId}`,
        error,
      );
      // Should not throw error to avoid breaking logout flow
    });
  });

  describe('batchRefreshPermissions', () => {
    it('should batch refresh permissions for multiple users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      const organizationId = 'org-456';

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        PERMISSIONS.ARTICLE_CREATE,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Spy on logger to verify logging

      // Act
      await service.batchRefreshPermissions(userIds, organizationId);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledTimes(3);
      expect(mockCacheService.set).toHaveBeenCalledTimes(3);
      expect(logger.log).toHaveBeenCalledWith(
        `Batch refreshed permissions for ${userIds.length} users`,
      );
    });

    it('should batch refresh permissions without organization context', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        PERMISSIONS.ARTICLE_CREATE,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Act
      await service.batchRefreshPermissions(userIds);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledTimes(2);
      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
    });

    it('should handle empty user list', async () => {
      // Arrange
      const userIds: string[] = [];

      // Spy on logger to verify logging

      // Act
      await service.batchRefreshPermissions(userIds);

      // Assert
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        `Batch refreshed permissions for 0 users`,
      );
    });
  });

  describe('isCached', () => {
    it('should return true when permissions are cached', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockCacheService.exists.mockResolvedValue(true);

      // Act
      const result = await service.isCached(userId, organizationId);

      // Assert
      expect(result).toBe(true);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${organizationId}`,
      );
    });

    it('should return false when permissions are not cached', async () => {
      // Arrange
      const userId = 'user-123';

      mockCacheService.exists.mockResolvedValue(false);

      // Act
      const result = await service.isCached(userId);

      // Assert
      expect(result).toBe(false);
      expect(mockCacheService.exists).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
      );
    });
  });

  describe('Convenience methods', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(
        PERMISSIONS.ARTICLE_CREATE.toString(),
      );
    });

    describe('isAdmin', () => {
      it('should return true when user has ADMINISTRATOR permission', async () => {
        // Arrange
        const userId = 'user-123';
        mockCacheService.get.mockResolvedValue(
          PERMISSIONS.ADMINISTRATOR.toString(),
        );

        // Act
        const result = await service.isAdmin(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user does not have ADMINISTRATOR permission', async () => {
        // Arrange
        const userId = 'user-123';
        mockCacheService.get.mockResolvedValue(
          PERMISSIONS.ARTICLE_CREATE.toString(),
        );

        // Act
        const result = await service.isAdmin(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('isRegularUser', () => {
      it('should return true when user has no admin permissions', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions =
          PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.COMMENT_CREATE;
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.isRegularUser(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user has admin permissions', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions =
          PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ADMINISTRATOR;
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.isRegularUser(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canManageContent', () => {
      it('should return true when user can manage content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions =
          PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canManageContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot manage content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.COMMENT_CREATE; // Missing ARTICLE_CREATE
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canManageContent(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canModerateContent', () => {
      it('should return true when user can moderate content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions =
          PERMISSIONS.ARTICLE_EDIT | PERMISSIONS.COMMENT_EDIT;
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canModerateContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot moderate content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.ARTICLE_CREATE; // Missing edit permissions
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canModerateContent(userId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('canManageOrganization', () => {
      it('should return true when user can manage organization', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userPermissions =
          PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS |
          PERMISSIONS.ORGANIZATION_MANAGE_SETTINGS;
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canManageOrganization(
          userId,
          organizationId,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot manage organization', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userPermissions = PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS; // Missing SETTINGS
        mockCacheService.get.mockResolvedValue(userPermissions.toString());

        // Act
        const result = await service.canManageOrganization(
          userId,
          organizationId,
        );

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('Cache key generation', () => {
    it('should generate correct cache key with organization context', () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      // Act
      const result = service['getCacheKey'](userId, organizationId);

      // Assert
      expect(result).toBe(`user:permissions:${userId}:org:${organizationId}`);
    });

    it('should generate correct cache key without organization context', () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const result = service['getCacheKey'](userId);

      // Assert
      expect(result).toBe(`user:permissions:${userId}`);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complete user session lifecycle with caching', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(userPermissions.toString());
      mockCacheService.delete.mockResolvedValue(undefined);

      // Act - Simulate complete user session
      await service.initUserPermissions(userId, organizationId);
      const cachedPermissions = await service.getUserPermissions(
        userId,
        organizationId,
      );
      const hasPermission = await service.hasPermission(
        userId,
        'ARTICLE_CREATE',
        organizationId,
      );
      await service.clearUserPermissions(userId, organizationId);

      // Assert
      expect(cachedPermissions).toBe(userPermissions);
      expect(hasPermission).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalledTimes(1); // Only during init
      expect(mockCacheService.get).toHaveBeenCalledTimes(2); // getUserPermissions + hasPermission
      expect(mockCacheService.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle cache miss and reload scenario', async () => {
      // Arrange
      const userId = 'user-123';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockCacheService.get.mockResolvedValueOnce(null); // Cache miss
      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);

      // Spy on logger to verify warning

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toBe(userPermissions);
      expect(logger.warn).toHaveBeenCalledWith(
        `Cache miss for user ${userId}, loading from database`,
      );
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, undefined);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}`,
        userPermissions.toString(),
        3600,
      );
    });

    it('should handle organization context switching', async () => {
      // Arrange
      const userId = 'user-123';
      const org1 = 'org-1';
      const org2 = 'org-2';
      const userPermissions = PERMISSIONS.ARTICLE_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(userPermissions.toString());

      // Act - User switches between organizations
      await service.initUserPermissions(userId, org1);
      const permissions1 = await service.getUserPermissions(userId, org1);

      await service.initUserPermissions(userId, org2);
      const permissions2 = await service.getUserPermissions(userId, org2);

      // Assert
      expect(permissions1).toBe(userPermissions);
      expect(permissions2).toBe(userPermissions);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${org1}`,
        userPermissions.toString(),
        3600,
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:permissions:${userId}:org:${org2}`,
        userPermissions.toString(),
        3600,
      );
    });
  });
});
