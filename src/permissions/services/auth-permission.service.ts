import { Injectable, Logger } from '@nestjs/common';
import { UserPermissionService } from 'src/permissions/services/user-permission.service';

/**
 * Auth service integration for permission management
 * Handles permission initialization on login and cleanup on logout
 */
@Injectable()
export class AuthPermissionService {
  private readonly logger = new Logger(AuthPermissionService.name);

  constructor(private readonly userPermissionService: UserPermissionService) {}

  /**
   * Initialize user permissions on login
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async onUserLogin(userId: string, organizationId?: string): Promise<void> {
    try {
      await this.userPermissionService.initUserPermissions(
        userId,
        organizationId,
      );
      this.logger.log(`Initialized permissions for user ${userId} on login`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize permissions for user ${userId} on login`,
        error,
      );
      // Don't throw error to avoid breaking login flow
    }
  }

  /**
   * Clear user permissions on logout
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async onUserLogout(userId: string, organizationId?: string): Promise<void> {
    try {
      await this.userPermissionService.clearUserPermissions(
        userId,
        organizationId,
      );
      this.logger.log(`Cleared permissions for user ${userId} on logout`);
    } catch (error) {
      this.logger.error(
        `Failed to clear permissions for user ${userId} on logout`,
        error,
      );
      // Don't throw error to avoid breaking logout flow
    }
  }

  /**
   * Refresh user permissions when they change
   * @param userId - User ID
   * @param organizationId - Optional organization context
   */
  async onPermissionsChanged(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      await this.userPermissionService.refreshUserPermissions(
        userId,
        organizationId,
      );
      this.logger.log(`Refreshed permissions for user ${userId} after change`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Batch refresh permissions for multiple users
   * @param userIds - Array of user IDs
   * @param organizationId - Optional organization context
   */
  async onBatchPermissionsChanged(
    userIds: string[],
    organizationId?: string,
  ): Promise<void> {
    try {
      await this.userPermissionService.batchRefreshPermissions(
        userIds,
        organizationId,
      );
      this.logger.log(
        `Batch refreshed permissions for ${userIds.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to batch refresh permissions for ${userIds.length} users`,
        error,
      );
      throw error;
    }
  }
}
