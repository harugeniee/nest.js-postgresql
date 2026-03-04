import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/shared/services';
import { PermissionEvaluator } from './permission-evaluator.service';

/**
 * UserPermissionService — cache lifecycle for user permissions.
 * Manages Redis cache for permission bitfields on login/logout/change.
 *
 * For permission checks, use PermissionEvaluator directly.
 */
@Injectable()
export class UserPermissionService {
  private readonly logger = new Logger(UserPermissionService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'user:permissions';

  constructor(
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => PermissionEvaluator))
    private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  /**
   * Initialize user permissions in Redis (call on login)
   */
  async initUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      const effective = await this.permissionEvaluator.getEffectivePermissions(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );

      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        effective.allowPermissions.toString(),
        this.CACHE_TTL,
      );
    } catch (error) {
      this.logger.error(`Failed to init permissions for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Refresh user permissions in Redis (call when permissions change)
   */
  async refreshUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      const effective = await this.permissionEvaluator.getEffectivePermissions(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );

      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.set(
        cacheKey,
        effective.allowPermissions.toString(),
        this.CACHE_TTL,
      );

      await this.permissionEvaluator.invalidateCache(
        userId,
        organizationId ? 'organization' : undefined,
        organizationId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove user permissions from Redis (call on logout)
   */
  async clearUserPermissions(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(userId, organizationId);
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error(
        `Failed to clear permissions for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Batch refresh permissions for multiple users
   */
  async batchRefreshPermissions(
    userIds: string[],
    organizationId?: string,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) =>
        this.refreshUserPermissions(userId, organizationId),
      ),
    );
  }

  /**
   * Check if user permissions are cached
   */
  async isCached(userId: string, organizationId?: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(userId, organizationId);
    return this.cacheService.exists(cacheKey);
  }

  private getCacheKey(userId: string, organizationId?: string): string {
    return organizationId
      ? `${this.CACHE_PREFIX}:${userId}:org:${organizationId}`
      : `${this.CACHE_PREFIX}:${userId}`;
  }
}
