import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthPermissionService } from './auth-permission.service';
import { UserPermissionService } from './user-permission.service';

/**
 * Unit tests for AuthPermissionService
 * Tests permission initialization and cleanup during authentication events
 */
describe('AuthPermissionService', () => {
  let service: AuthPermissionService;
  let userPermissionService: UserPermissionService;
  let logger: Logger;

  // Mock UserPermissionService
  const mockUserPermissionService = {
    initUserPermissions: jest.fn(),
    clearUserPermissions: jest.fn(),
    refreshUserPermissions: jest.fn(),
    batchRefreshPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPermissionService,
        {
          provide: UserPermissionService,
          useValue: mockUserPermissionService,
        },
      ],
    }).compile();

    service = module.get<AuthPermissionService>(AuthPermissionService);
    userPermissionService = module.get<UserPermissionService>(
      UserPermissionService,
    );
    logger = service['logger'];

    // Mock the logger methods
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onUserLogin', () => {
    it('should initialize user permissions on login successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      mockUserPermissionService.initUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onUserLogin(userId, organizationId);

      // Assert
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should initialize user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserPermissionService.initUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onUserLogin(userId);

      // Assert
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenCalledWith(userId, undefined);
    });

    it('should handle initialization errors gracefully without breaking login flow', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Permission initialization failed');
      mockUserPermissionService.initUserPermissions.mockRejectedValue(error);

      // Act
      await service.onUserLogin(userId);

      // Assert
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenCalledWith(userId, undefined);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to initialize permissions for user ${userId} on login`,
        error,
      );
      // Should not throw error to avoid breaking login flow
    });
  });

  describe('onUserLogout', () => {
    it('should clear user permissions on logout successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      mockUserPermissionService.clearUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onUserLogout(userId, organizationId);

      // Assert
      expect(
        mockUserPermissionService.clearUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should clear user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserPermissionService.clearUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onUserLogout(userId);

      // Assert
      expect(
        mockUserPermissionService.clearUserPermissions,
      ).toHaveBeenCalledWith(userId, undefined);
    });

    it('should handle cleanup errors gracefully without breaking logout flow', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Permission cleanup failed');
      mockUserPermissionService.clearUserPermissions.mockRejectedValue(error);

      // Act
      await service.onUserLogout(userId);

      // Assert
      expect(
        mockUserPermissionService.clearUserPermissions,
      ).toHaveBeenCalledWith(userId, undefined);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to clear permissions for user ${userId} on logout`,
        error,
      );
      // Should not throw error to avoid breaking logout flow
    });
  });

  describe('onPermissionsChanged', () => {
    it('should refresh user permissions when they change', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onPermissionsChanged(userId, organizationId);

      // Assert
      expect(
        mockUserPermissionService.refreshUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should refresh user permissions without organization context', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onPermissionsChanged(userId);

      // Assert
      expect(
        mockUserPermissionService.refreshUserPermissions,
      ).toHaveBeenCalledWith(userId, undefined);
    });

    it('should throw error when permission refresh fails', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Permission refresh failed');
      mockUserPermissionService.refreshUserPermissions.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onPermissionsChanged(userId)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('onBatchPermissionsChanged', () => {
    it('should batch refresh permissions for multiple users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      const organizationId = 'org-456';
      mockUserPermissionService.batchRefreshPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onBatchPermissionsChanged(userIds, organizationId);

      // Assert
      expect(
        mockUserPermissionService.batchRefreshPermissions,
      ).toHaveBeenCalledWith(userIds, organizationId);
    });

    it('should batch refresh permissions without organization context', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      mockUserPermissionService.batchRefreshPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onBatchPermissionsChanged(userIds);

      // Assert
      expect(
        mockUserPermissionService.batchRefreshPermissions,
      ).toHaveBeenCalledWith(userIds, undefined);
    });

    it('should throw error when batch refresh fails', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      const error = new Error('Batch refresh failed');
      mockUserPermissionService.batchRefreshPermissions.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(service.onBatchPermissionsChanged(userIds)).rejects.toThrow(
        error,
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to batch refresh permissions for ${userIds.length} users`,
        error,
      );
    });

    it('should handle empty user list', async () => {
      // Arrange
      const userIds: string[] = [];
      mockUserPermissionService.batchRefreshPermissions.mockResolvedValue(
        undefined,
      );

      // Act
      await service.onBatchPermissionsChanged(userIds);

      // Assert
      expect(
        mockUserPermissionService.batchRefreshPermissions,
      ).toHaveBeenCalledWith(userIds, undefined);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete user session lifecycle', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';

      mockUserPermissionService.initUserPermissions.mockResolvedValue(
        undefined,
      );
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );
      mockUserPermissionService.clearUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act - Simulate complete user session
      await service.onUserLogin(userId, organizationId);
      await service.onPermissionsChanged(userId, organizationId);
      await service.onUserLogout(userId, organizationId);

      // Assert
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
      expect(
        mockUserPermissionService.refreshUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
      expect(
        mockUserPermissionService.clearUserPermissions,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should handle organization context switching', async () => {
      // Arrange
      const userId = 'user-123';
      const org1 = 'org-1';
      const org2 = 'org-2';

      mockUserPermissionService.initUserPermissions.mockResolvedValue(
        undefined,
      );
      mockUserPermissionService.clearUserPermissions.mockResolvedValue(
        undefined,
      );

      // Act - User switches between organizations
      await service.onUserLogin(userId, org1);
      await service.onUserLogout(userId, org1);
      await service.onUserLogin(userId, org2);

      // Assert
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenNthCalledWith(1, userId, org1);
      expect(
        mockUserPermissionService.initUserPermissions,
      ).toHaveBeenNthCalledWith(2, userId, org2);
      expect(
        mockUserPermissionService.clearUserPermissions,
      ).toHaveBeenCalledWith(userId, org1);
    });
  });
});
