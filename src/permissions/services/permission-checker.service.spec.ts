import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionName } from 'src/shared/constants';
import { PERMISSIONS } from '../constants/permissions.constants';
import { PermissionsService } from '../permissions.service';
import { PermissionChecker } from './permission-checker.service';

/**
 * Unit tests for PermissionChecker service
 * Tests high-performance permission checking with caching
 */
describe('PermissionChecker', () => {
  let service: PermissionChecker;
  let permissionsService: PermissionsService;
  let logger: Logger;

  // Mock PermissionsService
  const mockPermissionsService = {
    getUserPermissionsBitfield: jest.fn(),
    getUserPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionChecker,
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<PermissionChecker>(PermissionChecker);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    logger = service['logger'];

    // Mock the logger methods
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'ARTICLE_CREATE';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasPermission(
        userId,
        permission,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should return false when user does not have permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'ADMINISTRATOR';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(false);
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, undefined);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = 'ARTICLE_CREATE';
      const error = new Error('Permission check failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check permission ${permission} for user ${userId}`,
        error,
      );
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has ALL required permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE', 'ARTICLE_EDIT'];
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasAllPermissions(
        userId,
        permissions,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should return false when user is missing one permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE', 'ARTICLE_EDIT'];
      const userPermissions = PERMISSIONS.ARTICLE_CREATE; // Only has CREATE

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasAllPermissions(userId, permissions);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE'];
      const error = new Error('Permission check failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasAllPermissions(userId, permissions);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check all permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE', 'ARTICLE_EDIT'];
      const userPermissions = PERMISSIONS.ARTICLE_CREATE; // Only has CREATE

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasAnyPermission(userId, permissions);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE', 'ARTICLE_EDIT'];
      const userPermissions = PERMISSIONS.COMMENT_CREATE; // Different permission

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasAnyPermission(userId, permissions);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ARTICLE_CREATE'];
      const error = new Error('Permission check failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasAnyPermission(userId, permissions);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check any permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('hasNonePermissions', () => {
    it('should return true when user has none of the forbidden permissions', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ADMINISTRATOR', 'BAN_MEMBERS'];
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.COMMENT_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasNonePermissions(userId, permissions);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user has at least one forbidden permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ADMINISTRATOR', 'BAN_MEMBERS'];
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ADMINISTRATOR;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.hasNonePermissions(userId, permissions);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const permissions: PermissionName[] = ['ADMINISTRATOR'];
      const error = new Error('Permission check failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act
      const result = await service.hasNonePermissions(userId, permissions);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check none permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('checkPermissions', () => {
    it('should check complex permission logic with ALL + ANY + NONE', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const options = {
        all: ['ARTICLE_CREATE'] as PermissionName[],
        any: ['ARTICLE_EDIT', 'ARTICLE_DELETE'] as PermissionName[],
        none: ['ADMINISTRATOR', 'BAN_MEMBERS'] as PermissionName[],
      };
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.checkPermissions(
        userId,
        options,
        organizationId,
      );

      // Assert
      expect(result).toBe(true);
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should return false when ALL condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        all: ['ARTICLE_CREATE', 'ARTICLE_EDIT'] as PermissionName[],
      };
      const userPermissions = PERMISSIONS.ARTICLE_CREATE; // Missing EDIT

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when ANY condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        any: ['ARTICLE_CREATE', 'ARTICLE_EDIT'] as PermissionName[],
      };
      const userPermissions = PERMISSIONS.COMMENT_CREATE; // Different permission

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NONE condition is not met', async () => {
      // Arrange
      const userId = 'user-123';
      const options = {
        none: ['ADMINISTRATOR'] as PermissionName[],
      };
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ADMINISTRATOR;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when permission check fails', async () => {
      // Arrange
      const userId = 'user-123';
      const options = { all: ['ARTICLE_CREATE'] as PermissionName[] };
      const error = new Error('Permission check failed');

      mockPermissionsService.getUserPermissionsBitfield.mockRejectedValue(
        error,
      );

      // Spy on logger to verify error logging

      // Act
      const result = await service.checkPermissions(userId, options);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to check complex permissions for user ${userId}`,
        error,
      );
    });
  });

  describe('Convenience methods', () => {
    describe('isAdmin', () => {
      it('should return true when user has ADMINISTRATOR permission', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.ADMINISTRATOR;

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

        // Act
        const result = await service.isAdmin(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user does not have ADMINISTRATOR permission', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.ARTICLE_CREATE;

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
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

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

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

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

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

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

        // Act
        const result = await service.canManageContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot manage content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.COMMENT_CREATE; // Missing ARTICLE_CREATE

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

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

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

        // Act
        const result = await service.canModerateContent(userId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user cannot moderate content', async () => {
        // Arrange
        const userId = 'user-123';
        const userPermissions = PERMISSIONS.ARTICLE_CREATE; // Missing edit permissions

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

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

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

        // Act
        const result = await service.canManageOrganization(
          userId,
          organizationId,
        );

        // Assert
        expect(result).toBe(true);
        expect(
          mockPermissionsService.getUserPermissionsBitfield,
        ).toHaveBeenCalledWith(userId, organizationId);
      });

      it('should return false when user cannot manage organization', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userPermissions = PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS; // Missing SETTINGS

        mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
          userPermissions,
        );

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

  describe('getUserPermissions', () => {
    it('should return user permissions as bitfield', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act
      const result = await service.getUserPermissions(userId, organizationId);

      // Assert
      expect(result).toBe(userPermissions);
      expect(
        mockPermissionsService.getUserPermissionsBitfield,
      ).toHaveBeenCalledWith(userId, organizationId);
    });
  });

  describe('getUserPermissionNames', () => {
    it('should return user permissions as array of names', async () => {
      // Arrange
      const userId = 'user-123';
      const organizationId = 'org-456';
      const permissionNames = ['ARTICLE_CREATE', 'ARTICLE_EDIT'];

      mockPermissionsService.getUserPermissions.mockResolvedValue(
        permissionNames,
      );

      // Act
      const result = await service.getUserPermissionNames(
        userId,
        organizationId,
      );

      // Assert
      expect(result).toEqual(permissionNames);
      expect(mockPermissionsService.getUserPermissions).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle content creator permissions', async () => {
      // Arrange
      const userId = 'creator-123';
      const userPermissions =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act & Assert
      expect(await service.canManageContent(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(true);
      expect(await service.isAdmin(userId)).toBe(false);
    });

    it('should handle moderator permissions', async () => {
      // Arrange
      const userId = 'moderator-123';
      const userPermissions =
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_EDIT |
        PERMISSIONS.COMMENT_DELETE;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act & Assert
      expect(await service.canModerateContent(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(true);
      expect(await service.isAdmin(userId)).toBe(false);
    });

    it('should handle admin permissions', async () => {
      // Arrange
      const userId = 'admin-123';
      const userPermissions = PERMISSIONS.ADMINISTRATOR;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act & Assert
      expect(await service.isAdmin(userId)).toBe(true);
      expect(await service.isRegularUser(userId)).toBe(false);
      expect(await service.canManageContent(userId)).toBe(false); // Admin doesn't need content permissions
    });

    it('should handle organization manager permissions', async () => {
      // Arrange
      const userId = 'manager-123';
      const organizationId = 'org-456';
      const userPermissions =
        PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS |
        PERMISSIONS.ORGANIZATION_MANAGE_SETTINGS;

      mockPermissionsService.getUserPermissionsBitfield.mockResolvedValue(
        userPermissions,
      );

      // Act & Assert
      expect(await service.canManageOrganization(userId, organizationId)).toBe(
        true,
      );
      expect(await service.isRegularUser(userId)).toBe(true);
      expect(await service.isAdmin(userId)).toBe(false);
    });
  });
});
