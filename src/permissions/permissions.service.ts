import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { ScopePermission } from './entities/scope-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { EffectivePermissions } from './interfaces/effective-permissions.interface';
import { PermissionEvaluator } from './services/permission-evaluator.service';
import { PermissionRegistry } from './services/permission-registry.service';
import { RoleService } from './services/role.service';
import { ScopePermissionService } from './services/scope-permission.service';
import { UserRoleService } from './services/user-role.service';
import { PermissionKey } from './types/permission-key.type';

/**
 * PermissionsService — thin facade delegating to focused services.
 * Maintains identical method signatures for backward compatibility.
 *
 * Delegates to:
 *  - RoleService (role CRUD, default roles, initialization)
 *  - UserRoleService (assign/remove roles, queries)
 *  - PermissionEvaluator (evaluate, effective permissions)
 *  - ScopePermissionService (scope-level permissions)
 *  - Segment permission methods kept here (use UserPermission entity)
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => UserRoleService))
    private readonly userRoleService: UserRoleService,
    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(forwardRef(() => ScopePermissionService))
    private readonly scopePermissionService: ScopePermissionService,
    @Inject(forwardRef(() => PermissionRegistry))
    private readonly permissionRegistry: PermissionRegistry,
    @Inject(forwardRef(() => UserPermissionService))
    private readonly userPermissionService: UserPermissionService,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
  ) {}

  // ==================== ROLE CRUD (→ RoleService) ====================

  async createRole(dto: CreateRoleDto): Promise<Role> {
    return this.roleService.createRole(dto);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    return this.roleService.updateRole(id, dto);
  }

  async findById(id: string): Promise<Role> {
    return this.roleService.findById(id);
  }

  async findOne(
    where: FindOptionsWhere<Role>,
    options?: { relations?: string[] },
  ): Promise<Role | null> {
    return this.roleService.findOne(where, options);
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    return this.roleService.update(id, data);
  }

  async remove(id: string): Promise<void> {
    return this.roleService.remove(id);
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleService.findRoleByName(name);
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  async createDefaultRoles(organization: Organization): Promise<Role[]> {
    return this.roleService.createDefaultRoles(organization);
  }

  async updateRolePermissions(
    roleId: string,
    allowPermissions: string,
    denyPermissions: string,
  ): Promise<Role> {
    return this.roleService.updateRolePermissions(
      roleId,
      allowPermissions,
      denyPermissions,
    );
  }

  // ==================== USER-ROLE (→ UserRoleService) ====================

  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    return this.userRoleService.assignRole(dto);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    return this.userRoleService.removeRole(userId, roleId);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleService.getUserRoles(userId);
  }

  async getUsersWithRole(roleId: string): Promise<UserRole[]> {
    return this.userRoleService.getUsersWithRole(roleId);
  }

  async hasRoleName(userId: string, roleName: string): Promise<boolean> {
    return this.userRoleService.hasRoleName(userId, roleName);
  }

  // ==================== PERMISSION EVALUATION (→ PermissionEvaluator) ====================

  async evaluate(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    return this.permissionEvaluator.evaluate(
      userId,
      permissionKey,
      scopeType,
      scopeId,
    );
  }

  async getUserEffectivePermissions(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EffectivePermissions> {
    return this.permissionEvaluator.getEffectivePermissions(
      userId,
      scopeType,
      scopeId,
    );
  }

  async hasContextPermission(
    userId: string,
    permissionKey: PermissionKey,
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    return this.permissionEvaluator.evaluate(
      userId,
      permissionKey,
      contextType,
      contextId,
    );
  }

  async hasAnyContextPermission(
    userId: string,
    permissionKeys: PermissionKey[],
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    for (const key of permissionKeys) {
      if (
        await this.permissionEvaluator.evaluate(
          userId,
          key,
          contextType,
          contextId,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  async hasAllContextPermissions(
    userId: string,
    permissionKeys: PermissionKey[],
    contextType: string,
    contextId: string,
  ): Promise<boolean> {
    for (const key of permissionKeys) {
      if (
        !(await this.permissionEvaluator.evaluate(
          userId,
          key,
          contextType,
          contextId,
        ))
      ) {
        return false;
      }
    }
    return true;
  }

  // ==================== SCOPE PERMISSIONS (→ ScopePermissionService) ====================

  async grantScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
    allow: boolean = true,
  ): Promise<ScopePermission> {
    return this.scopePermissionService.grantScopePermission(
      scopeType,
      scopeId,
      permissionKey,
      allow,
    );
  }

  async revokeScopePermission(
    scopeType: string,
    scopeId: string,
    permissionKey: string,
  ): Promise<void> {
    return this.scopePermissionService.revokeScopePermission(
      scopeType,
      scopeId,
      permissionKey,
    );
  }

  // ==================== SEGMENT PERMISSIONS ====================

  async grantSegmentPermission(
    dto: GrantSegmentPermissionDto,
  ): Promise<UserPermission> {
    try {
      const permissionBit = this.permissionRegistry.getBitMask(dto.permission);
      if (permissionBit === 0n) {
        throw new HttpException(
          { messageKey: 'permission.INVALID_PERMISSION' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const existing = await this.userPermissionRepository.findOne({
        where: {
          userId: dto.userId,
          permission: dto.permission,
          contextId: dto.segmentId,
          contextType: 'segment',
        },
      });

      if (existing && !existing.isDeleted()) {
        throw new HttpException(
          { messageKey: 'permission.USER_PERMISSION_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const userPermissionData = {
        userId: dto.userId,
        permission: dto.permission,
        allowPermissions: permissionBit.toString(),
        denyPermissions: '0',
        contextId: dto.segmentId,
        contextType: 'segment',
        reason: dto.reason,
        grantedBy: dto.grantedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      };

      let saved: UserPermission;
      if (existing) {
        Object.assign(existing, userPermissionData);
        existing.deletedAt = null;
        saved = await this.userPermissionRepository.save(existing);
      } else {
        saved = await this.userPermissionRepository.save(userPermissionData);
      }

      await this.userPermissionService.refreshUserPermissions(dto.userId);
      await this.permissionEvaluator.invalidateUserCache(dto.userId);

      return saved;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error granting segment permission to user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async revokeSegmentPermission(
    dto: RevokeSegmentPermissionDto,
  ): Promise<void> {
    try {
      const userPermission = await this.userPermissionRepository.findOne({
        where: {
          userId: dto.userId,
          permission: dto.permission,
          contextId: dto.segmentId,
          contextType: 'segment',
        },
      });

      if (!userPermission || userPermission.isDeleted()) {
        throw new HttpException(
          { messageKey: 'permission.USER_PERMISSION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.userPermissionRepository.softDelete(userPermission.id);
      await this.userPermissionService.refreshUserPermissions(dto.userId);
      await this.permissionEvaluator.invalidateUserCache(dto.userId);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error revoking segment permission from user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async canUpdateSegment(userId: string, segmentId: string): Promise<boolean> {
    return this.permissionEvaluator.evaluate(
      userId,
      'segment.update',
      'segment',
      segmentId,
    );
  }

  async getUserSegmentPermissions(userId: string): Promise<UserPermission[]> {
    return this.userPermissionRepository.find({
      where: { userId, contextType: 'segment' },
      order: { createdAt: 'DESC' },
    });
  }

  async getUsersWithSegmentPermission(
    segmentId: string,
    permission?: PermissionKey,
  ): Promise<UserPermission[]> {
    const where: FindOptionsWhere<UserPermission> = {
      contextId: segmentId,
      contextType: 'segment',
      ...(permission && { permission }),
    };
    return this.userPermissionRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
