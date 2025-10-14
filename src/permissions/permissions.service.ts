import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { seedPermissions } from 'src/db/seed/permissions.seed';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { PermissionName } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import { In, Repository } from 'typeorm';
import {
  DEFAULT_ROLES,
  EffectivePermissions,
  OverwriteTargetType,
  PERMISSIONS,
} from './constants/permissions.constants';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateOverwriteDto } from './dto/create-overwrite.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { EffectivePermissionsDto } from './dto/effective-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ChannelOverwrite } from './entities/channel-overwrite.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';

/**
 * Permissions service implementing Discord-style permission system
 * Handles role management, user-role assignments, channel overwrites,
 * and effective permission calculations using BigInt bitwise operations
 */
@Injectable()
export class PermissionsService
  extends BaseService<Role>
  implements OnModuleInit
{
  private readonly logger = new Logger(PermissionsService.name);
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,

    @InjectRepository(ChannelOverwrite)
    private readonly channelOverwriteRepository: Repository<ChannelOverwrite>,

    cacheService: CacheService,

    @Inject(forwardRef(() => UserPermissionService))
    private readonly userPermissionService: UserPermissionService,
  ) {
    super(
      new TypeOrmBaseRepository<Role>(roleRepository),
      {
        entityName: 'Role',
        cache: {
          enabled: true,
          ttlSec: 300,
          prefix: 'permissions:role',
          swrSec: 60,
        },
        defaultSearchField: 'name',
        relationsWhitelist: {
          userRoles: true,
        },
        selectWhitelist: {
          id: true,
          name: true,
          description: true,
          permissions: true,
          position: true,
          color: true,
          mentionable: true,
          managed: true,
          icon: true,
          unicodeEmoji: true,
        },
      },
      cacheService,
    );
  }

  /**
   * Initialize permissions data when module starts
   */
  async onModuleInit(): Promise<void> {
    await this.initializeData();
  }

  /**
   * Initialize permissions data if not already exists
   * Checks for existing data before seeding to avoid duplicates
   */
  private async initializeData(): Promise<void> {
    try {
      // Check if roles already exist
      const existingRolesCount = await this.roleRepository.count();

      if (existingRolesCount === 0) {
        this.logger.log('No roles found, initializing permissions data...');

        // Get DataSource from repository to pass to seed function
        const dataSource = this.roleRepository.manager.connection;
        await seedPermissions(dataSource);

        this.logger.log(
          'Permissions data initialization completed successfully',
        );
      } else {
        this.logger.log(
          `Permissions data already exists (${existingRolesCount} roles found), skipping initialization`,
        );
      }
    } catch (error) {
      this.logger.error('Error initializing permissions data:', error);
      throw error;
    }
  }

  /**
   * Define which fields can be searched
   */
  protected getSearchableColumns(): (keyof Role)[] {
    return ['name', 'description'];
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Create a new role
   */
  async createRole(dto: CreateRoleDto): Promise<Role> {
    const roleData = {
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions || '0',
      position: dto.position || 0,
      color: dto.color,
      mentionable: dto.mentionable || false,
      managed: dto.managed || false,
      icon: dto.icon,
      unicodeEmoji: dto.unicodeEmoji,
    };

    return this.create(roleData);
  }

  /**
   * Update an existing role
   */
  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const updateData: Partial<Role> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.mentionable !== undefined) updateData.mentionable = dto.mentionable;
    if (dto.managed !== undefined) updateData.managed = dto.managed;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.unicodeEmoji !== undefined)
      updateData.unicodeEmoji = dto.unicodeEmoji;

    return this.update(id, updateData);
  }

  /**
   * Get a role by name
   */
  async findRoleByName(name: string): Promise<Role | null> {
    return this.findOne({ name });
  }

  /**
   * Get all roles ordered by position (highest first)
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { position: 'DESC', createdAt: 'ASC' },
      select: this.opts.selectWhitelist,
    });
  }

  // ==================== USER-ROLE MANAGEMENT ====================

  /**
   * Assign a role to a user
   */
  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    // Check if role exists
    const role = await this.findById(dto.roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.userRoleRepository.findOne({
      where: { userId: dto.userId, roleId: dto.roleId },
    });

    if (existingAssignment) {
      throw new Error(`User ${dto.userId} already has role ${dto.roleId}`);
    }

    const userRoleData = {
      userId: dto.userId,
      roleId: dto.roleId,
      reason: dto.reason,
      assignedBy: dto.assignedBy,
      isTemporary: dto.isTemporary || false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };

    const saved = await this.userRoleRepository.save(userRoleData);
    // Refresh user's cached permissions after role assignment
    await this.userPermissionService.refreshUserPermissions(dto.userId);
    return saved;
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const assignment = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Role assignment not found for user ${userId} and role ${roleId}`,
      );
    }

    await this.userRoleRepository.remove(assignment);
    // Refresh user's cached permissions after role removal
    await this.userPermissionService.refreshUserPermissions(userId);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  // ==================== CHANNEL OVERWRITES ====================

  /**
   * Create or update a channel overwrite
   */
  async createOverwrite(dto: CreateOverwriteDto): Promise<ChannelOverwrite> {
    // Check if overwrite already exists
    const existing = await this.channelOverwriteRepository.findOne({
      where: {
        channelId: dto.channelId,
        targetId: dto.targetId,
        targetType: dto.targetType,
      },
    });

    if (existing) {
      // Update existing overwrite
      existing.allow = dto.allow || '0';
      existing.deny = dto.deny || '0';
      existing.reason = dto.reason;
      const updated = await this.channelOverwriteRepository.save(existing);
      // TODO: Implement cache invalidation for channel overwrites when needed
      return updated;
    }

    // Create new overwrite
    const overwriteData = {
      channelId: dto.channelId,
      targetId: dto.targetId,
      targetType: dto.targetType,
      allow: dto.allow || '0',
      deny: dto.deny || '0',
      reason: dto.reason,
    };

    const created = await this.channelOverwriteRepository.save(overwriteData);
    // TODO: Implement cache invalidation for channel overwrites when needed
    return created;
  }

  /**
   * Get all overwrites for a channel
   */
  async getChannelOverwrites(channelId: string): Promise<ChannelOverwrite[]> {
    return this.channelOverwriteRepository.find({
      where: { channelId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Delete a channel overwrite
   */
  async deleteOverwrite(
    channelId: string,
    targetId: string,
    targetType: OverwriteTargetType,
  ): Promise<void> {
    const overwrite = await this.channelOverwriteRepository.findOne({
      where: { channelId, targetId, targetType },
    });

    if (!overwrite) {
      throw new NotFoundException(
        `Overwrite not found for channel ${channelId}, target ${targetId}`,
      );
    }

    await this.channelOverwriteRepository.remove(overwrite);
    // TODO: Implement cache invalidation for channel overwrites when needed
  }

  // ==================== PERMISSION CALCULATION ====================

  /**
   * Compute effective permissions for a user in a channel using Discord algorithm
   * This implements the canonical Discord permission calculation algorithm
   */
  async computeEffectivePermissions(
    dto: EffectivePermissionsDto,
  ): Promise<EffectivePermissions> {
    const { userId, channelId } = dto;

    if (!userId) {
      throw new Error('userId is required for permission calculation');
    }

    // 1. Load user roles (including @everyone role)
    const userRoles = await this.getUserRoles(userId);
    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get the everyone role (should always exist)
    const everyoneRole = await this.findRoleByName(DEFAULT_ROLES.EVERYONE);
    if (everyoneRole) {
      roleIds.push(everyoneRole.id);
    }

    // Get role entities
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
    });

    // 2. Calculate base permissions from roles (OR operation)
    let permissions = 0n;
    for (const role of roles) {
      permissions |= BigInt(role.permissions);
    }

    // 3. Short-circuit for ADMINISTRATOR permission
    if ((permissions & PERMISSIONS.ADMINISTRATOR) !== 0n) {
      return {
        mask: ~0n, // All permissions (all bits set)
        map: this.permissionsMaskToMap(~0n),
      };
    }

    // If no channel specified, return base permissions
    if (!channelId) {
      return {
        mask: permissions,
        map: this.permissionsMaskToMap(permissions),
      };
    }

    // 4. Apply @everyone overwrite for the channel
    const everyoneOverwrite = await this.channelOverwriteRepository.findOne({
      where: {
        channelId,
        targetType: OverwriteTargetType.ROLE,
        targetId: everyoneRole?.id || DEFAULT_ROLES.EVERYONE,
      },
    });

    if (everyoneOverwrite) {
      const deny = BigInt(everyoneOverwrite.deny);
      const allow = BigInt(everyoneOverwrite.allow);
      permissions = (permissions & ~deny) | allow;
    }

    // 5. Aggregate role overwrites (deny first, then allow)
    let roleDeny = 0n;
    let roleAllow = 0n;

    const roleOverwrites = await this.channelOverwriteRepository.find({
      where: {
        channelId,
        targetType: OverwriteTargetType.ROLE,
        targetId: In(roleIds.filter((id) => id !== everyoneRole?.id)),
      },
    });

    for (const overwrite of roleOverwrites) {
      roleDeny |= BigInt(overwrite.deny);
      roleAllow |= BigInt(overwrite.allow);
    }

    // Apply role overwrites: deny first, then allow
    permissions = (permissions & ~roleDeny) | roleAllow;

    // 6. Apply member-specific overwrite (highest priority)
    const memberOverwrite = await this.channelOverwriteRepository.findOne({
      where: {
        channelId,
        targetType: OverwriteTargetType.MEMBER,
        targetId: userId,
      },
    });

    if (memberOverwrite) {
      const deny = BigInt(memberOverwrite.deny);
      const allow = BigInt(memberOverwrite.allow);
      permissions = (permissions & ~deny) | allow;
    }

    return {
      mask: permissions,
      map: this.permissionsMaskToMap(permissions),
    };
  }

  /**
   * Check if a user has a specific permission in a channel
   */
  async hasPermission(
    userId: string,
    permission: bigint,
    channelId?: string,
  ): Promise<boolean> {
    const effective = await this.computeEffectivePermissions({
      userId,
      channelId,
    });
    return (effective.mask & permission) !== 0n;
  }

  /**
   * Get user permissions as bitfield (for backward compatibility with existing code)
   */
  async getUserPermissionsBitfield(
    userId: string,
    channelId?: string,
  ): Promise<bigint> {
    const effective = await this.computeEffectivePermissions({
      userId,
      channelId,
    });
    return effective.mask;
  }

  /**
   * Get user permissions (for backward compatibility with existing code)
   */
  async getUserPermissions(userId: string): Promise<PermissionName[]> {
    const effective = await this.computeEffectivePermissions({ userId });
    const permissions: PermissionName[] = [];

    for (const [key, value] of Object.entries(PERMISSIONS)) {
      if ((effective.mask & value) !== 0n) {
        permissions.push(key as PermissionName);
      }
    }

    return permissions;
  }

  /**
   * Convert permission mask to human-readable boolean map
   */
  private permissionsMaskToMap(mask: bigint): Record<string, boolean> {
    const map: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(PERMISSIONS)) {
      map[key] = (mask & value) !== 0n;
    }

    return map;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Create default roles for a new server/guild
   */
  async createDefaultRoles(): Promise<Role[]> {
    const defaultRoles = [
      {
        name: DEFAULT_ROLES.EVERYONE,
        description: 'Default role assigned to all users',
        permissions: '0',
        position: 0,
        mentionable: false,
      },
      {
        name: DEFAULT_ROLES.MEMBER,
        description: 'Default role for server members',
        permissions: '0',
        position: 1,
        mentionable: false,
      },
      {
        name: DEFAULT_ROLES.MODERATOR,
        description: 'Server moderators with moderation permissions',
        permissions: this.calculateModeratorPermissions().toString(),
        position: 2,
        mentionable: true,
      },
      {
        name: DEFAULT_ROLES.ADMIN,
        description: 'Server administrators with administrative permissions',
        permissions: this.calculateAdminPermissions().toString(),
        position: 3,
        mentionable: true,
      },
      {
        name: DEFAULT_ROLES.OWNER,
        description: 'Server owner with full permissions',
        permissions: (~0n).toString(),
        position: 4,
        mentionable: true,
      },
    ];

    const createdRoles: Role[] = [];
    for (const roleData of defaultRoles) {
      const role = await this.create(roleData);
      createdRoles.push(role);
    }

    return createdRoles;
  }

  /**
   * Calculate permissions for moderator role using existing constants
   */
  private calculateModeratorPermissions(): bigint {
    return (
      PERMISSIONS.VIEW_CHANNEL |
      PERMISSIONS.SEND_MESSAGES |
      PERMISSIONS.READ_MESSAGE_HISTORY |
      PERMISSIONS.ADD_REACTIONS |
      PERMISSIONS.EMBED_LINKS |
      PERMISSIONS.ATTACH_FILES |
      PERMISSIONS.MENTION_EVERYONE |
      PERMISSIONS.USE_EXTERNAL_EMOJIS |
      PERMISSIONS.CONNECT |
      PERMISSIONS.SPEAK |
      PERMISSIONS.MUTE_MEMBERS |
      PERMISSIONS.DEAFEN_MEMBERS |
      PERMISSIONS.MOVE_MEMBERS |
      PERMISSIONS.MANAGE_MESSAGES
    );
  }

  /**
   * Calculate permissions for admin role using existing constants
   */
  private calculateAdminPermissions(): bigint {
    return (
      this.calculateModeratorPermissions() |
      PERMISSIONS.KICK_MEMBERS |
      PERMISSIONS.BAN_MEMBERS |
      PERMISSIONS.MANAGE_CHANNELS |
      PERMISSIONS.MANAGE_ROLES |
      PERMISSIONS.MANAGE_WEBHOOKS |
      PERMISSIONS.MANAGE_EMOJIS_AND_STICKERS |
      PERMISSIONS.VIEW_AUDIT_LOG |
      PERMISSIONS.VIEW_GUILD_INSIGHTS
    );
  }
}
