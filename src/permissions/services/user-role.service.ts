import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { PermissionEvaluator } from './permission-evaluator.service';
import { RoleService } from './role.service';
import { UserPermissionService } from './user-permission.service';

/**
 * UserRoleService handles user-role assignments (assign, remove, query).
 */
@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
    @Inject(forwardRef(() => UserPermissionService))
    private readonly userPermissionService: UserPermissionService,
    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    try {
      const role = await this.roleService.findById(dto.roleId);
      if (!role) {
        throw new HttpException(
          { messageKey: 'permission.ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      const existingAssignment = await this.userRoleRepository.findOne({
        where: { userId: dto.userId, roleId: dto.roleId },
      });
      if (existingAssignment) {
        throw new HttpException(
          { messageKey: 'permission.USER_ROLE_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const userRole = this.userRoleRepository.create({
        userId: dto.userId,
        roleId: dto.roleId,
        reason: dto.reason,
        assignedBy: dto.assignedBy,
        isTemporary: dto.isTemporary || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      });
      await this.userRoleRepository.save(userRole);

      await this.userPermissionService.refreshUserPermissions(dto.userId);
      await this.permissionEvaluator.invalidateUserCache(dto.userId);

      return userRole;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error assigning role ${dto.roleId} to user ${dto.userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      const assignment = await this.userRoleRepository.findOne({
        where: { userId, roleId },
      });
      if (!assignment) {
        throw new HttpException(
          { messageKey: 'permission.USER_ROLE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.userRoleRepository.remove(assignment);
      await this.userPermissionService.refreshUserPermissions(userId);
      await this.permissionEvaluator.invalidateUserCache(userId);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Error removing role ${roleId} from user ${userId}:`,
        error,
      );
      throw new HttpException(
        { messageKey: 'permission.PERMISSION_INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  async getUsersWithRole(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId },
      relations: ['role'],
      order: { createdAt: 'ASC' },
    });
  }

  async hasRoleName(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles.some(
        (userRole) =>
          userRole.role &&
          userRole.role.name === roleName &&
          userRole.isValid(),
      );
    } catch (error) {
      this.logger.error(
        `Error checking role ${roleName} for user ${userId}:`,
        error,
      );
      return false;
    }
  }
}
