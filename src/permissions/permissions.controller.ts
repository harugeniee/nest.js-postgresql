import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes/snowflake-id.pipe';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { EffectivePermissionsDto } from './dto/effective-permissions.dto';
import { GrantSegmentPermissionDto } from './dto/grant-segment-permission.dto';
import { RevokeSegmentPermissionDto } from './dto/revoke-segment-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { EffectivePermissions } from './interfaces/effective-permissions.interface';
import { PermissionsService } from './permissions.service';
import { PermissionKey } from './types/permission-key.type';

/**
 * Permissions controller providing REST API endpoints for Discord-style permission system
 * Handles role management, user-role assignments, and permission calculations
 */
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ==================== ROLE ENDPOINTS ====================

  @Post('roles')
  @Auth(['admin'])
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.permissionsService.createRole(dto);
  }

  @Get('roles')
  @Auth()
  async getAllRoles(): Promise<Role[]> {
    return this.permissionsService.getAllRoles();
  }

  @Get('roles/:id')
  @Auth()
  async getRole(@Param('id', SnowflakeIdPipe) id: string): Promise<Role> {
    return this.permissionsService.findById(id);
  }

  @Patch('roles/:id')
  @Auth(['admin'])
  async updateRole(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.permissionsService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @Auth(['admin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id', SnowflakeIdPipe) id: string): Promise<void> {
    return this.permissionsService.remove(id);
  }

  // ==================== USER-ROLE ENDPOINTS ====================

  @Post('users/roles')
  @Auth(['admin'])
  @HttpCode(HttpStatus.CREATED)
  async assignRole(@Body() dto: AssignRoleDto): Promise<UserRole> {
    return this.permissionsService.assignRole(dto);
  }

  @Delete('users/:userId/roles/:roleId')
  @Auth(['admin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('userId', SnowflakeIdPipe) userId: string,
    @Param('roleId', SnowflakeIdPipe) roleId: string,
  ): Promise<void> {
    return this.permissionsService.removeRole(userId, roleId);
  }

  @Get('users/:userId/roles')
  @Auth()
  async getUserRoles(
    @Param('userId', SnowflakeIdPipe) userId: string,
  ): Promise<UserRole[]> {
    return this.permissionsService.getUserRoles(userId);
  }

  @Get('roles/:roleId/users')
  @Auth()
  async getUsersWithRole(
    @Param('roleId', SnowflakeIdPipe) roleId: string,
  ): Promise<UserRole[]> {
    return this.permissionsService.getUsersWithRole(roleId);
  }

  @Get('me/roles/check')
  @Auth()
  async checkCurrentUserRole(
    @Request() req: Request & { user: AuthPayload },
    @Query('roleName') roleName: string,
  ): Promise<{ hasRole: boolean }> {
    if (!roleName) {
      throw new BadRequestException({
        messageKey: 'permission.ROLE_NAME_REQUIRED',
      });
    }
    const hasRole = await this.permissionsService.hasRoleName(
      req.user.uid,
      roleName,
    );
    return { hasRole };
  }

  // ==================== PERMISSION CALCULATION ENDPOINTS ====================

  @Get('effective')
  @Auth()
  async computeEffectivePermissions(
    @Query() dto: EffectivePermissionsDto,
  ): Promise<EffectivePermissions> {
    if (!dto.userId) {
      throw new HttpException(
        { messageKey: 'permissions.userIdRequired' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.permissionsService.getUserEffectivePermissions(
      dto.userId,
      dto.scopeType,
      dto.scopeId,
    );
  }

  // ==================== SEGMENT PERMISSIONS ENDPOINTS ====================

  @Post('segments/permissions')
  @Auth(['admin'])
  @HttpCode(HttpStatus.CREATED)
  async grantSegmentPermission(
    @Body() dto: GrantSegmentPermissionDto,
  ): Promise<UserPermission> {
    return this.permissionsService.grantSegmentPermission(dto);
  }

  @Delete('segments/permissions')
  @Auth(['admin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSegmentPermission(
    @Body() dto: RevokeSegmentPermissionDto,
  ): Promise<void> {
    return this.permissionsService.revokeSegmentPermission(dto);
  }

  @Get('users/:userId/segments/permissions')
  @Auth()
  async getUserSegmentPermissions(
    @Param('userId', SnowflakeIdPipe) userId: string,
  ): Promise<UserPermission[]> {
    return this.permissionsService.getUserSegmentPermissions(userId);
  }

  @Get('segments/:segmentId/permissions')
  @Auth()
  async getUsersWithSegmentPermission(
    @Param('segmentId', SnowflakeIdPipe) segmentId: string,
    @Query('permission') permission?: PermissionKey,
  ): Promise<UserPermission[]> {
    return this.permissionsService.getUsersWithSegmentPermission(
      segmentId,
      permission,
    );
  }
}
