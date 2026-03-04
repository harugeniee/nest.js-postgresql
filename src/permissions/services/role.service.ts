import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services/base.service';
import { seedPermissions } from 'src/db/seed/permissions.seed';
import { Organization } from 'src/organizations/entities/organization.entity';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { DEFAULT_ROLES } from '../constants/permissions.constants';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { PermissionKey } from '../types/permission-key.type';
import { PermissionEvaluator } from './permission-evaluator.service';
import { PermissionRegistry } from './permission-registry.service';

/**
 * RoleService handles role CRUD operations and default role creation.
 * Extends BaseService<Role> for standard CRUD + caching.
 */
@Injectable()
export class RoleService extends BaseService<Role> implements OnModuleInit {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    cacheService: CacheService,
    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(forwardRef(() => PermissionRegistry))
    private readonly permissionRegistry: PermissionRegistry,
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
          allowPermissions: true,
          denyPermissions: true,
          scopeType: true,
          scopeId: true,
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

  async onModuleInit(): Promise<void> {
    await this.initializeData();
  }

  private async initializeData(): Promise<void> {
    try {
      const existingRolesCount = await this.roleRepository.count();
      if (existingRolesCount === 0) {
        this.logger.log('No roles found, initializing permissions data...');
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

  protected getSearchableColumns(): (keyof Role)[] {
    return ['name', 'description'];
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    try {
      const allowPermissions = dto.permissions || '0';
      const roleData = {
        name: dto.name,
        description: dto.description,
        allowPermissions,
        denyPermissions: '0',
        position: dto.position || 0,
        color: dto.color,
        mentionable: dto.mentionable || false,
        managed: dto.managed || false,
        icon: dto.icon,
        unicodeEmoji: dto.unicodeEmoji,
      };
      return this.create(roleData);
    } catch (error: any) {
      this.logger.error('Error creating role:', error);
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    try {
      const role = await this.findById(id);
      if (!role) {
        throw new HttpException(
          { messageKey: 'permission.ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      const updateData: Partial<Role> = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined)
        updateData.description = dto.description;
      if (dto.permissions !== undefined) {
        updateData.allowPermissions = dto.permissions;
        if (updateData.denyPermissions === undefined) {
          updateData.denyPermissions = '0';
        }
      }
      if (dto.position !== undefined) updateData.position = dto.position;
      if (dto.color !== undefined) updateData.color = dto.color;
      if (dto.mentionable !== undefined)
        updateData.mentionable = dto.mentionable;
      if (dto.managed !== undefined) updateData.managed = dto.managed;
      if (dto.icon !== undefined) updateData.icon = dto.icon;
      if (dto.unicodeEmoji !== undefined)
        updateData.unicodeEmoji = dto.unicodeEmoji;

      const updated = await this.update(id, updateData);

      // Invalidate cache for all users with this role
      const userRoles = await this.userRoleRepository.find({
        where: { roleId: id },
      });
      for (const ur of userRoles) {
        await this.permissionEvaluator.invalidateUserCache(ur.userId);
      }

      return updated;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error updating role ${id}:`, error);
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.findOne({ name });
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { position: 'DESC', createdAt: 'ASC' },
      select: this.opts.selectWhitelist,
    });
  }

  async updateRolePermissions(
    roleId: string,
    allowPermissions: string,
    denyPermissions: string,
  ): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new HttpException(
        { messageKey: 'permission.ROLE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.update(roleId, {
      allowPermissions,
      denyPermissions,
    });

    const userRoles = await this.userRoleRepository.find({
      where: { roleId },
    });
    for (const ur of userRoles) {
      await this.permissionEvaluator.invalidateUserCache(ur.userId);
    }

    return updated;
  }

  async createDefaultRoles(organization: Organization): Promise<Role[]> {
    const roleNamePrefix = `${organization.slug}-`;
    const defaultRoles = [
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.EVERYONE}`,
        description: 'Default role assigned to all users',
        allowPermissions: '0',
        denyPermissions: '0',
        position: 0,
        mentionable: false,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.MEMBER}`,
        description: 'Default role for server members',
        allowPermissions: '0',
        denyPermissions: '0',
        position: 1,
        mentionable: false,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.MODERATOR}`,
        description: 'Server moderators with moderation permissions',
        allowPermissions: this.calculateModeratorPermissions().toString(),
        denyPermissions: '0',
        position: 2,
        mentionable: true,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.ADMIN}`,
        description: 'Server administrators with administrative permissions',
        allowPermissions: this.calculateAdminPermissions().toString(),
        denyPermissions: '0',
        position: 3,
        mentionable: true,
        organization,
      },
      {
        name: `${roleNamePrefix}${DEFAULT_ROLES.OWNER}`,
        description: 'Server owner with full permissions',
        allowPermissions: (~0n).toString(),
        denyPermissions: '0',
        position: 4,
        mentionable: true,
        organization,
      },
    ];

    const createdRoles: Role[] = [];
    for (const roleData of defaultRoles) {
      const existingRole = await this.findOne(
        { name: roleData.name },
        { relations: ['organization'] },
      );
      if (existingRole) {
        createdRoles.push(existingRole);
      } else {
        const role = await this.create(roleData);
        createdRoles.push(role);
      }
    }
    return createdRoles;
  }

  private calculateModeratorPermissions(): bigint {
    const permissionKeys: PermissionKey[] = [
      'article.read',
      'article.update',
      'series.update',
      'media.create',
      'sticker.read',
      'report.read',
      'report.update',
    ];
    return this.permissionRegistry.getBitMasks(permissionKeys);
  }

  private calculateAdminPermissions(): bigint {
    const permissionKeys: PermissionKey[] = [
      'article.read',
      'article.update',
      'series.update',
      'media.create',
      'sticker.read',
      'report.read',
      'report.update',
      'article.create',
      'series.create',
      'segment.create',
      'segment.update',
      'sticker.create',
      'sticker.update',
      'sticker.delete',
      'organization.update',
      'organization.read',
    ];
    return this.permissionRegistry.getBitMasks(permissionKeys);
  }
}
