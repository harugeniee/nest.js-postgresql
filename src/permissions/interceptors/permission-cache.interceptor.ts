import { Injectable, Logger } from '@nestjs/common';
import { AuthPermissionService } from 'src/permissions/services/auth-permission.service';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';

/**
 * Permission interceptor to automatically refresh cache when permissions change
 * Hooks into permission service operations
 */
@Injectable()
export class PermissionCacheInterceptor {
  private readonly logger = new Logger(PermissionCacheInterceptor.name);

  constructor(
    private readonly authPermissionService: AuthPermissionService,
    private readonly userPermissionService: UserPermissionService,
  ) {}

  async onRoleAssigned(userId: string, roleId: string): Promise<void> {
    try {
      await this.authPermissionService.onPermissionsChanged(userId);
      this.logger.log(
        `Refreshed permissions for user ${userId} after role assignment`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions after role assignment for user ${userId}`,
        error,
      );
    }
  }

  async onRoleRemoved(userId: string, roleId: string): Promise<void> {
    try {
      await this.authPermissionService.onPermissionsChanged(userId);
      this.logger.log(
        `Refreshed permissions for user ${userId} after role removal`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions after role removal for user ${userId}`,
        error,
      );
    }
  }

  async onRolePermissionsUpdated(roleId: string): Promise<void> {
    try {
      this.logger.log(
        `Role ${roleId} permissions updated - cache refresh needed for affected users`,
      );
      // TODO: Implement getting all users with this role and batch refresh
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions after role update for role ${roleId}`,
        error,
      );
    }
  }

  async onChannelOverwriteChanged(channelId: string): Promise<void> {
    try {
      this.logger.log(
        `Channel ${channelId} overwrite changed - cache refresh needed`,
      );
      // TODO: Implement clearing all user permission caches if needed
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions after channel overwrite change for channel ${channelId}`,
        error,
      );
    }
  }

  async isUserPermissionsCached(
    userId: string,
    organizationId?: string,
  ): Promise<boolean> {
    return this.userPermissionService.isCached(userId, organizationId);
  }

  async forceRefreshUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    await this.authPermissionService.onPermissionsChanged(
      userId,
      organizationId,
    );
  }
}
