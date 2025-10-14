import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_ROLES,
  OverwriteTargetType,
  PERMISSIONS,
} from './constants/permissions.constants';
import { ChannelOverwrite } from './entities/channel-overwrite.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsService } from './permissions.service';

/**
 * Helper function to create a complete mock Role object for testing
 */
function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: overrides.id || 'role-id',
    uuid: overrides.uuid || 'role-uuid',
    name: overrides.name || 'test-role',
    permissions: overrides.permissions || '0',
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
    getPermissionsAsBigInt: jest.fn(() => BigInt(overrides.permissions || '0')),
    setPermissionsFromBigInt: jest.fn(),
    hasPermission: jest.fn(),
    isEveryoneRole: jest.fn(() => false),
    isAdmin: jest.fn(() => false),
    toJSON: jest.fn(),
    isDeleted: jest.fn(() => false),
    getAge: jest.fn(() => 0),
    getTimeSinceUpdate: jest.fn(() => 0),
    ...overrides,
  } as Role;
}

/**
 * Unit tests for PermissionsService focusing on permission calculation algorithm
 * Tests 5+ canonical scenarios as required
 */
describe('PermissionsService', () => {
  let service: PermissionsService;
  let roleRepository: Repository<Role>;
  let userRoleRepository: Repository<UserRole>;
  let channelOverwriteRepository: Repository<ChannelOverwrite>;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ChannelOverwrite),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: 'CacheService',
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    userRoleRepository = module.get<Repository<UserRole>>(
      getRepositoryToken(UserRole),
    );
    channelOverwriteRepository = module.get<Repository<ChannelOverwrite>>(
      getRepositoryToken(ChannelOverwrite),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('computeEffectivePermissions', () => {
    beforeEach(() => {
      // Mock default everyone role
      jest.spyOn(service, 'findRoleByName').mockResolvedValue({
        id: 'everyone-role-id',
        name: DEFAULT_ROLES.EVERYONE,
        permissions: '0',
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        getPermissionsAsBigInt: () => 0n,
      } as Role);
    });

    it('Scenario 1: User with ADMINISTRATOR permission should return ALL_PERMISSIONS', async () => {
      // Arrange
      const userId = 'user-123';
      const adminRole = createMockRole({
        id: 'admin-role-id',
        name: 'admin',
        permissions: PERMISSIONS.ADMINISTRATOR.toString(),
        position: 3,
        isAdmin: jest.fn(() => true),
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: adminRole.id,
          role: adminRole,
          createdAt: new Date(),
        } as UserRole,
      ]);

      jest.spyOn(roleRepository, 'find').mockResolvedValue([adminRole]);

      // Act
      const result = await service.computeEffectivePermissions({ userId });

      // Assert
      expect(result.mask).toBe(~0n); // All permissions
      expect(result.map.ADMINISTRATOR).toBe(true);
    });

    it('Scenario 2: @everyone role denies VIEW_CHANNEL at channel level', async () => {
      // Arrange
      const userId = 'user-123';
      const channelId = 'channel-456';
      const memberRole = createMockRole({
        id: 'member-role-id',
        name: 'member',
        permissions: PERMISSIONS.VIEW_CHANNEL.toString(),
        position: 1,
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: memberRole.id,
          role: memberRole,
          createdAt: new Date(),
        } as UserRole,
      ]);

      jest.spyOn(roleRepository, 'find').mockResolvedValue([memberRole]);

      // Everyone role denies VIEW_CHANNEL
      jest.spyOn(channelOverwriteRepository, 'findOne').mockResolvedValue({
        id: 'overwrite-1',
        channelId,
        targetId: 'everyone-role-id',
        targetType: OverwriteTargetType.ROLE,
        allow: '0',
        deny: PERMISSIONS.VIEW_CHANNEL.toString(),
        createdAt: new Date(),
      } as ChannelOverwrite);

      // Act
      const result = await service.computeEffectivePermissions({
        userId,
        channelId,
      });

      // Assert
      expect(result.map.VIEW_CHANNEL).toBe(false);
    });

    it('Scenario 3: Role denies permission, another role allows it - allow wins after aggregation', async () => {
      // Arrange
      const userId = 'user-123';
      const channelId = 'channel-456';

      const denyRole = createMockRole({
        id: 'deny-role-id',
        name: 'deny-role',
        permissions: '0',
        position: 1,
      });

      const allowRole = createMockRole({
        id: 'allow-role-id',
        name: 'allow-role',
        permissions: PERMISSIONS.SEND_MESSAGES.toString(),
        position: 2,
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: denyRole.id,
          role: denyRole,
          createdAt: new Date(),
        },
        {
          id: 'user-role-2',
          userId,
          roleId: allowRole.id,
          role: allowRole,
          createdAt: new Date(),
        },
      ] as UserRole[]);

      jest
        .spyOn(roleRepository, 'find')
        .mockResolvedValue([denyRole, allowRole]);

      // Role overwrite: deny role denies SEND_MESSAGES, allow role allows it
      jest.spyOn(channelOverwriteRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(channelOverwriteRepository, 'find').mockResolvedValue([
        {
          id: 'overwrite-1',
          channelId,
          targetId: denyRole.id,
          targetType: OverwriteTargetType.ROLE,
          allow: '0',
          deny: PERMISSIONS.SEND_MESSAGES.toString(),
          createdAt: new Date(),
        },
        {
          id: 'overwrite-2',
          channelId,
          targetId: allowRole.id,
          targetType: OverwriteTargetType.ROLE,
          allow: PERMISSIONS.SEND_MESSAGES.toString(),
          deny: '0',
          createdAt: new Date(),
        },
      ] as ChannelOverwrite[]);

      // Act
      const result = await service.computeEffectivePermissions({
        userId,
        channelId,
      });

      // Assert
      expect(result.map.SEND_MESSAGES).toBe(true); // Allow should win
    });

    it('Scenario 4: Member-specific deny overrides role allow', async () => {
      // Arrange
      const userId = 'user-123';
      const channelId = 'channel-456';

      const role = createMockRole({
        id: 'role-id',
        name: 'role',
        permissions: PERMISSIONS.SEND_MESSAGES.toString(),
        position: 1,
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: role.id,
          role,
          createdAt: new Date(),
        } as UserRole,
      ]);

      jest.spyOn(roleRepository, 'find').mockResolvedValue([role]);

      // Role allows SEND_MESSAGES, but member overwrite denies it
      jest
        .spyOn(channelOverwriteRepository, 'findOne')
        .mockResolvedValueOnce(null) // everyone overwrite
        .mockResolvedValueOnce(null) // role overwrites
        .mockResolvedValueOnce({
          id: 'member-overwrite',
          channelId,
          targetId: userId,
          targetType: OverwriteTargetType.MEMBER,
          allow: '0',
          deny: PERMISSIONS.SEND_MESSAGES.toString(),
          createdAt: new Date(),
        } as ChannelOverwrite);

      // Act
      const result = await service.computeEffectivePermissions({
        userId,
        channelId,
      });

      // Assert
      expect(result.map.SEND_MESSAGES).toBe(false); // Member deny should override role allow
    });

    it('Scenario 5: Multiple role permissions merged with OR operation', async () => {
      // Arrange
      const userId = 'user-123';

      const role1 = createMockRole({
        id: 'role-1',
        name: 'role1',
        permissions: PERMISSIONS.VIEW_CHANNEL.toString(),
        position: 1,
      });

      const role2 = createMockRole({
        id: 'role-2',
        name: 'role2',
        permissions: PERMISSIONS.SEND_MESSAGES.toString(),
        position: 2,
      });

      const role3 = createMockRole({
        id: 'role-3',
        name: 'role3',
        permissions: PERMISSIONS.EMBED_LINKS.toString(),
        position: 3,
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: role1.id,
          role: role1,
          createdAt: new Date(),
        },
        {
          id: 'user-role-2',
          userId,
          roleId: role2.id,
          role: role2,
          createdAt: new Date(),
        },
        {
          id: 'user-role-3',
          userId,
          roleId: role3.id,
          role: role3,
          createdAt: new Date(),
        },
      ] as UserRole[]);

      jest
        .spyOn(roleRepository, 'find')
        .mockResolvedValue([role1, role2, role3]);

      // Act
      const result = await service.computeEffectivePermissions({ userId });

      // Assert
      expect(result.map.VIEW_CHANNEL).toBe(true);
      expect(result.map.SEND_MESSAGES).toBe(true);
      expect(result.map.EMBED_LINKS).toBe(true);
      expect(result.map.ADMINISTRATOR).toBe(false); // Not in any role

      // Verify the mask contains all three permissions
      const expectedMask =
        PERMISSIONS.VIEW_CHANNEL |
        PERMISSIONS.SEND_MESSAGES |
        PERMISSIONS.EMBED_LINKS;
      expect(result.mask).toBe(expectedMask);
    });

    it('Scenario 6: @everyone allow overrides base role deny', async () => {
      // Arrange
      const userId = 'user-123';
      const channelId = 'channel-456';

      const role = createMockRole({
        id: 'role-id',
        name: 'role',
        permissions: '0', // No permissions by default
        position: 1,
      });

      jest.spyOn(service, 'getUserRoles').mockResolvedValue([
        {
          id: 'user-role-1',
          userId,
          roleId: role.id,
          role,
          createdAt: new Date(),
        } as UserRole,
      ]);

      jest.spyOn(roleRepository, 'find').mockResolvedValue([role]);

      // Everyone role allows VIEW_CHANNEL
      jest.spyOn(channelOverwriteRepository, 'findOne').mockResolvedValue({
        id: 'everyone-overwrite',
        channelId,
        targetId: 'everyone-role-id',
        targetType: OverwriteTargetType.ROLE,
        allow: PERMISSIONS.VIEW_CHANNEL.toString(),
        deny: '0',
        createdAt: new Date(),
      } as ChannelOverwrite);

      // Act
      const result = await service.computeEffectivePermissions({
        userId,
        channelId,
      });

      // Assert
      expect(result.map.VIEW_CHANNEL).toBe(true); // Everyone allow should grant permission
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = PERMISSIONS.SEND_MESSAGES;

      jest.spyOn(service, 'computeEffectivePermissions').mockResolvedValue({
        mask: PERMISSIONS.SEND_MESSAGES,
        map: { SEND_MESSAGES: true },
      });

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permission = PERMISSIONS.ADMINISTRATOR;

      jest.spyOn(service, 'computeEffectivePermissions').mockResolvedValue({
        mask: PERMISSIONS.SEND_MESSAGES,
        map: { SEND_MESSAGES: true, ADMINISTRATOR: false },
      });

      // Act
      const result = await service.hasPermission(userId, permission);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createDefaultRoles', () => {
    it('should create default roles with correct permissions', async () => {
      // Arrange
      const mockRoles: Role[] = [];
      jest.spyOn(service, 'create').mockImplementation(async (data) => {
        const role = {
          ...data,
          id: `role-${mockRoles.length}`,
          createdAt: new Date(),
        } as Role;
        mockRoles.push(role);
        return role;
      });

      // Act
      const result = await service.createDefaultRoles();

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe(DEFAULT_ROLES.EVERYONE);
      expect(result[1].name).toBe(DEFAULT_ROLES.MEMBER);
      expect(result[2].name).toBe(DEFAULT_ROLES.MODERATOR);
      expect(result[3].name).toBe(DEFAULT_ROLES.ADMIN);
      expect(result[4].name).toBe(DEFAULT_ROLES.OWNER);

      // Check that owner has all permissions
      expect(BigInt(result[4].permissions)).toBe(~0n); // All permissions
    });
  });
});
