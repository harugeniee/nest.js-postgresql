import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { DEFAULT_ROLES } from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsService } from './permissions.service';
import { PermissionEvaluator } from './services/permission-evaluator.service';
import { PermissionRegistry } from './services/permission-registry.service';
import { RoleService } from './services/role.service';
import { ScopePermissionService } from './services/scope-permission.service';
import { UserPermissionService } from './services/user-permission.service';
import { UserRoleService } from './services/user-role.service';

function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: overrides.id || 'role-id',
    uuid: overrides.uuid || 'role-uuid',
    name: overrides.name || 'test-role',
    allowPermissions: overrides.allowPermissions || '0',
    denyPermissions: overrides.denyPermissions || '0',
    position: overrides.position || 0,
    color: overrides.color || '#000000',
    mentionable: overrides.mentionable || false,
    managed: overrides.managed || false,
    icon: overrides.icon || null,
    unicodeEmoji: overrides.unicodeEmoji || null,
    tags: overrides.tags || null,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    deletedAt: overrides.deletedAt || null,
    version: overrides.version || 1,
    userRoles: overrides.userRoles || [],
    getAllowPermissionsAsBigInt: jest.fn(() =>
      BigInt(overrides.allowPermissions || '0'),
    ),
    setAllowPermissionsFromBigInt: jest.fn(),
    getDenyPermissionsAsBigInt: jest.fn(() =>
      BigInt(overrides.denyPermissions || '0'),
    ),
    setDenyPermissionsFromBigInt: jest.fn(),
    isEveryoneRole: jest.fn(() => false),
    isAdmin: jest.fn(() => false),
    isScoped: jest.fn(() => false),
    isGlobal: jest.fn(() => true),
    toJSON: jest.fn(),
    isDeleted: jest.fn(() => false),
    getAge: jest.fn(() => 0),
    getTimeSinceUpdate: jest.fn(() => 0),
    ...overrides,
  } as Role;
}

/**
 * Unit tests for PermissionsService (facade)
 * Verifies delegation to sub-services
 */
describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockRoleService = {
    createRole: jest.fn(),
    updateRole: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findRoleByName: jest.fn(),
    getAllRoles: jest.fn(),
    createDefaultRoles: jest.fn(),
    updateRolePermissions: jest.fn(),
  };

  const mockUserRoleService = {
    assignRole: jest.fn(),
    removeRole: jest.fn(),
    getUserRoles: jest.fn(),
    getUsersWithRole: jest.fn(),
    hasRoleName: jest.fn(),
  };

  const mockPermissionEvaluator = {
    evaluate: jest.fn(),
    getEffectivePermissions: jest.fn(),
    invalidateUserCache: jest.fn(),
  };

  const mockScopePermissionService = {
    grantScopePermission: jest.fn(),
    revokeScopePermission: jest.fn(),
  };

  const mockPermissionRegistry = {
    getBitMask: jest.fn(),
    getBitMasks: jest.fn(),
  };

  const mockUserPermissionService = {
    refreshUserPermissions: jest.fn(),
  };

  const mockUserPermissionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: RoleService, useValue: mockRoleService },
        { provide: UserRoleService, useValue: mockUserRoleService },
        { provide: PermissionEvaluator, useValue: mockPermissionEvaluator },
        {
          provide: ScopePermissionService,
          useValue: mockScopePermissionService,
        },
        { provide: PermissionRegistry, useValue: mockPermissionRegistry },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
        {
          provide: getRepositoryToken(UserPermission),
          useValue: mockUserPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Role CRUD delegation ====================

  describe('createRole', () => {
    it('should delegate to RoleService.createRole', async () => {
      const dto: CreateRoleDto = { name: 'test-role', permissions: '123' };
      const expected = createMockRole({ name: 'test-role' });
      mockRoleService.createRole.mockResolvedValue(expected);

      const result = await service.createRole(dto);

      expect(result).toEqual(expected);
      expect(mockRoleService.createRole).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateRole', () => {
    it('should delegate to RoleService.updateRole', async () => {
      const dto: UpdateRoleDto = { name: 'updated' };
      const expected = createMockRole({ name: 'updated' });
      mockRoleService.updateRole.mockResolvedValue(expected);

      const result = await service.updateRole('role-1', dto);

      expect(result).toEqual(expected);
      expect(mockRoleService.updateRole).toHaveBeenCalledWith('role-1', dto);
    });

    it('should propagate HttpException from RoleService', async () => {
      mockRoleService.updateRole.mockRejectedValue(
        new HttpException('permission.ROLE_NOT_FOUND', HttpStatus.NOT_FOUND),
      );

      await expect(service.updateRole('bad-id', { name: 'x' })).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('findById', () => {
    it('should delegate to RoleService.findById', async () => {
      const expected = createMockRole({ id: 'role-1' });
      mockRoleService.findById.mockResolvedValue(expected);

      const result = await service.findById('role-1');

      expect(result).toEqual(expected);
      expect(mockRoleService.findById).toHaveBeenCalledWith('role-1');
    });
  });

  describe('getAllRoles', () => {
    it('should delegate to RoleService.getAllRoles', async () => {
      const roles = [createMockRole(), createMockRole({ name: 'role-2' })];
      mockRoleService.getAllRoles.mockResolvedValue(roles);

      const result = await service.getAllRoles();

      expect(result).toEqual(roles);
      expect(mockRoleService.getAllRoles).toHaveBeenCalled();
    });
  });

  describe('createDefaultRoles', () => {
    it('should delegate to RoleService.createDefaultRoles', async () => {
      const org = { id: 'org-1', slug: 'test-org' } as Organization;
      const roles = [
        createMockRole({ name: `test-org-${DEFAULT_ROLES.EVERYONE}` }),
        createMockRole({ name: `test-org-${DEFAULT_ROLES.MEMBER}` }),
        createMockRole({ name: `test-org-${DEFAULT_ROLES.MODERATOR}` }),
        createMockRole({ name: `test-org-${DEFAULT_ROLES.ADMIN}` }),
        createMockRole({
          name: `test-org-${DEFAULT_ROLES.OWNER}`,
          allowPermissions: (~0n).toString(),
        }),
      ];
      mockRoleService.createDefaultRoles.mockResolvedValue(roles);

      const result = await service.createDefaultRoles(org);

      expect(result).toHaveLength(5);
      expect(mockRoleService.createDefaultRoles).toHaveBeenCalledWith(org);
      expect(BigInt(result[4].allowPermissions || '0')).toBe(~0n);
    });
  });

  // ==================== User-Role delegation ====================

  describe('assignRole', () => {
    it('should delegate to UserRoleService.assignRole', async () => {
      const dto: AssignRoleDto = {
        userId: 'user-1',
        roleId: 'role-1',
        reason: 'test',
      };
      const expected = {
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
      } as UserRole;
      mockUserRoleService.assignRole.mockResolvedValue(expected);

      const result = await service.assignRole(dto);

      expect(result).toEqual(expected);
      expect(mockUserRoleService.assignRole).toHaveBeenCalledWith(dto);
    });
  });

  describe('removeRole', () => {
    it('should delegate to UserRoleService.removeRole', async () => {
      mockUserRoleService.removeRole.mockResolvedValue(undefined);

      await service.removeRole('user-1', 'role-1');

      expect(mockUserRoleService.removeRole).toHaveBeenCalledWith(
        'user-1',
        'role-1',
      );
    });

    it('should propagate HttpException when assignment not found', async () => {
      mockUserRoleService.removeRole.mockRejectedValue(
        new HttpException(
          'permission.USER_ROLE_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        ),
      );

      await expect(service.removeRole('user-1', 'role-1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getUserRoles', () => {
    it('should delegate to UserRoleService.getUserRoles', async () => {
      const roles = [{ id: 'ur-1' } as UserRole];
      mockUserRoleService.getUserRoles.mockResolvedValue(roles);

      const result = await service.getUserRoles('user-1');

      expect(result).toEqual(roles);
      expect(mockUserRoleService.getUserRoles).toHaveBeenCalledWith('user-1');
    });
  });

  describe('hasRoleName', () => {
    it('should delegate to UserRoleService.hasRoleName', async () => {
      mockUserRoleService.hasRoleName.mockResolvedValue(true);

      const result = await service.hasRoleName('user-1', 'admin');

      expect(result).toBe(true);
      expect(mockUserRoleService.hasRoleName).toHaveBeenCalledWith(
        'user-1',
        'admin',
      );
    });
  });

  // ==================== Permission evaluation delegation ====================

  describe('evaluate', () => {
    it('should delegate to PermissionEvaluator.evaluate', async () => {
      mockPermissionEvaluator.evaluate.mockResolvedValue(true);

      const result = await service.evaluate(
        'user-1',
        'article.read',
        'organization',
        'org-1',
      );

      expect(result).toBe(true);
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        'user-1',
        'article.read',
        'organization',
        'org-1',
      );
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should delegate to PermissionEvaluator.getEffectivePermissions', async () => {
      const effective = { allowPermissions: 123n, denyPermissions: 0n };
      mockPermissionEvaluator.getEffectivePermissions.mockResolvedValue(
        effective,
      );

      const result = await service.getUserEffectivePermissions('user-1');

      expect(result).toEqual(effective);
      expect(
        mockPermissionEvaluator.getEffectivePermissions,
      ).toHaveBeenCalledWith('user-1', undefined, undefined);
    });
  });

  // ==================== Segment permissions ====================

  describe('grantSegmentPermission', () => {
    it('should grant segment permission successfully', async () => {
      const dto: GrantSegmentPermissionDto = {
        userId: 'user-1',
        segmentId: 'seg-1',
        permission: 'segment.update',
        reason: 'test',
        grantedBy: 'admin-1',
      };

      mockPermissionRegistry.getBitMask.mockReturnValue(4n);
      mockUserPermissionRepository.findOne.mockResolvedValue(null);
      mockUserPermissionRepository.save.mockResolvedValue({
        id: 'up-1',
        ...dto,
      });
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );
      mockPermissionEvaluator.invalidateUserCache.mockResolvedValue(undefined);

      const result = await service.grantSegmentPermission(dto);

      expect(result).toBeDefined();
      expect(mockPermissionRegistry.getBitMask).toHaveBeenCalledWith(
        'segment.update',
      );
      expect(mockUserPermissionRepository.save).toHaveBeenCalled();
    });

    it('should throw when permission key is invalid', async () => {
      const dto: GrantSegmentPermissionDto = {
        userId: 'user-1',
        segmentId: 'seg-1',
        permission: 'invalid.key' as any,
      };

      mockPermissionRegistry.getBitMask.mockReturnValue(0n);

      await expect(service.grantSegmentPermission(dto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('revokeSegmentPermission', () => {
    it('should revoke segment permission successfully', async () => {
      const dto: RevokeSegmentPermissionDto = {
        userId: 'user-1',
        segmentId: 'seg-1',
        permission: 'segment.update',
      };

      const existing = {
        id: 'up-1',
        isDeleted: jest.fn(() => false),
      } as any;
      mockUserPermissionRepository.findOne.mockResolvedValue(existing);
      mockUserPermissionRepository.softDelete.mockResolvedValue(undefined);
      mockUserPermissionService.refreshUserPermissions.mockResolvedValue(
        undefined,
      );
      mockPermissionEvaluator.invalidateUserCache.mockResolvedValue(undefined);

      await service.revokeSegmentPermission(dto);

      expect(mockUserPermissionRepository.softDelete).toHaveBeenCalledWith(
        'up-1',
      );
    });

    it('should throw when permission not found', async () => {
      const dto: RevokeSegmentPermissionDto = {
        userId: 'user-1',
        segmentId: 'seg-1',
        permission: 'segment.update',
      };

      mockUserPermissionRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeSegmentPermission(dto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('canUpdateSegment', () => {
    it('should delegate to PermissionEvaluator.evaluate with segment context', async () => {
      mockPermissionEvaluator.evaluate.mockResolvedValue(true);

      const result = await service.canUpdateSegment('user-1', 'seg-1');

      expect(result).toBe(true);
      expect(mockPermissionEvaluator.evaluate).toHaveBeenCalledWith(
        'user-1',
        'segment.update',
        'segment',
        'seg-1',
      );
    });
  });
});
