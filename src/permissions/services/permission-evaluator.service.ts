import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScopePermission } from 'src/permissions/entities/scope-permission.entity';
import { UserPermission } from 'src/permissions/entities/user-permission.entity';
import { UserRole } from 'src/permissions/entities/user-role.entity';
import { EffectivePermissions } from 'src/permissions/interfaces/effective-permissions.interface';
import {
  EvaluationContext,
  EvaluationResult,
} from 'src/permissions/interfaces/evaluation-context.interface';
import { PermissionRegistry } from 'src/permissions/services/permission-registry.service';
import { PermissionKey } from 'src/permissions/types/permission-key.type';
import {
  aggregateAllowBitfields,
  aggregateDenyBitfields,
  checkPermissionStatus,
  evaluatePermissionWithPrecedence,
} from 'src/permissions/utils/evaluation.util';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';

/**
 * Cached effective permissions structure
 * Used for type safety when parsing cached data
 */
interface CachedEffectivePermissions {
  allowPermissions: string;
  denyPermissions: string;
  permissions: Record<string, boolean>;
  permissionDetails: Record<string, 'allow' | 'deny' | 'undefined'>;
}

/**
 * PermissionEvaluator service
 * Implements permission evaluation with precedence logic:
 * Scope → Role → User (scope has highest priority, user lowest)
 * Deny always overrides allow at each level
 */
@Injectable()
export class PermissionEvaluator {
  private readonly logger = new Logger(PermissionEvaluator.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'permissions:effective';

  constructor(
    @InjectRepository(ScopePermission)
    private readonly scopePermissionRepository: Repository<ScopePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Evaluate if a user has a specific permission
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns true if user has permission, false otherwise
   */
  async evaluate(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    const result = await this.evaluateWithDetails(
      userId,
      permissionKey,
      scopeType,
      scopeId,
    );
    return result.allowed;
  }

  /**
   * Evaluate permission with detailed result
   * @param userId - User ID
   * @param permissionKey - PermissionKey to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns EvaluationResult with details
   */
  async evaluateWithDetails(
    userId: string,
    permissionKey: PermissionKey,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EvaluationResult> {
    // Get bit index for permission key
    const bitIndex = this.permissionRegistry.getBitIndex(permissionKey);
    if (bitIndex === null) {
      this.logger.warn(`PermissionKey ${permissionKey} not found in registry`);
      return {
        allowed: false,
        level: 'default',
        denied: false,
        reason: `PermissionKey ${permissionKey} not registered`,
      };
    }

    // Load all permission sources
    const context: EvaluationContext = { userId, scopeType, scopeId };
    const { scopeAllow, scopeDeny, roleAllow, roleDeny, userAllow, userDeny } =
      await this.loadPermissionSources(context);

    // Evaluate with precedence
    const evaluation = evaluatePermissionWithPrecedence(
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
      bitIndex,
    );

    return {
      allowed: evaluation.allowed,
      level: evaluation.level,
      denied: !evaluation.allowed && evaluation.level !== 'default',
      reason: `Permission ${permissionKey} ${evaluation.allowed ? 'allowed' : 'denied'} at ${evaluation.level} level`,
    };
  }

  /**
   * Get effective permissions for a user in a scope
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns EffectivePermissions with all permissions
   */
  async getEffectivePermissions(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<EffectivePermissions> {
    const cacheKey = this.getCacheKey(userId, scopeType, scopeId);

    // Try cache first
    const cached = await this.cacheService?.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached as string) as CachedEffectivePermissions;
      return {
        allowPermissions: BigInt(parsed.allowPermissions),
        denyPermissions: BigInt(parsed.denyPermissions),
        permissions: parsed.permissions,
        permissionDetails: parsed.permissionDetails,
      };
    }

    // Load permission sources
    const context: EvaluationContext = { userId, scopeType, scopeId };
    const { scopeAllow, scopeDeny, roleAllow, roleDeny, userAllow, userDeny } =
      await this.loadPermissionSources(context);

    // Combine all levels with precedence
    // Final allow = scope allow OR (role allow AND NOT scope deny) OR (user allow AND NOT role deny AND NOT scope deny)
    // Final deny = scope deny OR role deny OR user deny
    const finalAllow = this.combineAllowPermissions(
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
    );
    const finalDeny = scopeDeny | roleDeny | userDeny;

    // Build permission maps
    const allPermissionKeys = this.permissionRegistry.getAllPermissionKeys();
    const permissions: Record<string, boolean> = {};
    const permissionDetails: Record<string, 'allow' | 'deny' | 'undefined'> =
      {};

    for (const key of allPermissionKeys) {
      const bitIndex = this.permissionRegistry.getBitIndex(key);
      if (bitIndex === null) continue;

      const status = checkPermissionStatus(finalAllow, finalDeny, bitIndex);
      permissionDetails[key] = status;
      permissions[key] = status === 'allow';
    }

    const result: EffectivePermissions = {
      allowPermissions: finalAllow,
      denyPermissions: finalDeny,
      permissions,
      permissionDetails,
    };

    // Cache result
    await this.cacheService?.set(
      cacheKey,
      JSON.stringify({
        allowPermissions: finalAllow.toString(),
        denyPermissions: finalDeny.toString(),
        permissions,
        permissionDetails,
      }),
      this.CACHE_TTL,
    );

    return result;
  }

  /**
   * Evaluate multiple permission keys in a single batch.
   * Loads permission sources once and checks all keys against them.
   * @param userId - User ID
   * @param permissionKeys - Array of PermissionKeys to check
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns Map of PermissionKey → boolean
   */
  async evaluateBatch(
    userId: string,
    permissionKeys: PermissionKey[],
    scopeType?: string,
    scopeId?: string,
  ): Promise<Map<PermissionKey, boolean>> {
    const context: EvaluationContext = { userId, scopeType, scopeId };
    const sources = await this.loadPermissionSources(context);
    const results = new Map<PermissionKey, boolean>();

    for (const key of permissionKeys) {
      const bitIndex = this.permissionRegistry.getBitIndex(key);
      if (bitIndex === null) {
        results.set(key, false);
        continue;
      }
      const evaluation = evaluatePermissionWithPrecedence(
        sources.scopeAllow,
        sources.scopeDeny,
        sources.roleAllow,
        sources.roleDeny,
        sources.userAllow,
        sources.userDeny,
        bitIndex,
      );
      results.set(key, evaluation.allowed);
    }

    return results;
  }

  /**
   * Check if user has ALL of the given permissions (batch).
   */
  async hasAllPermissions(
    userId: string,
    permissionKeys: PermissionKey[],
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    const results = await this.evaluateBatch(
      userId,
      permissionKeys,
      scopeType,
      scopeId,
    );
    return permissionKeys.every((k) => results.get(k) === true);
  }

  /**
   * Check if user has ANY of the given permissions (batch).
   */
  async hasAnyPermission(
    userId: string,
    permissionKeys: PermissionKey[],
    scopeType?: string,
    scopeId?: string,
  ): Promise<boolean> {
    const results = await this.evaluateBatch(
      userId,
      permissionKeys,
      scopeType,
      scopeId,
    );
    return permissionKeys.some((k) => results.get(k) === true);
  }

  /**
   * Load all permission sources for evaluation.
   * Optimized: runs 3 independent queries in parallel and filters
   * roles from the eager-loaded relation (no extra DB queries).
   * @param context - Evaluation context
   * @returns Aggregated permission bitfields
   */
  private async loadPermissionSources(context: EvaluationContext): Promise<{
    scopeAllow: bigint;
    scopeDeny: bigint;
    roleAllow: bigint;
    roleDeny: bigint;
    userAllow: bigint;
    userDeny: bigint;
  }> {
    const hasScope = !!(context.scopeType && context.scopeId);

    // Run 3 independent queries in parallel (down from 5 sequential)
    const [scopePermissions, userRoles, userPermissions] = await Promise.all([
      hasScope
        ? this.scopePermissionRepository.find({
            where: {
              scopeType: context.scopeType,
              scopeId: context.scopeId,
            },
          })
        : Promise.resolve([] as ScopePermission[]),
      this.userRoleRepository.find({
        where: { userId: context.userId },
        relations: ['role'],
      }),
      this.userPermissionRepository.find({
        where: { userId: context.userId },
      }),
    ]);

    // Process scope permissions
    const validScopePermissions = scopePermissions.filter((sp) => sp.isValid());
    const scopeAllow = aggregateAllowBitfields(
      validScopePermissions.map((sp) => sp.getAllowPermissionsAsBigInt()),
    );
    const scopeDeny = aggregateDenyBitfields(
      validScopePermissions.map((sp) => sp.getDenyPermissionsAsBigInt()),
    );

    // Filter roles in memory from eager-loaded relation (eliminates 2 extra queries)
    const validUserRoles = userRoles.filter((ur) => ur.isValid() && ur.role);
    const roles = validUserRoles
      .map((ur) => ur.role)
      .filter((role) => {
        const isGlobal = !role.scopeType && !role.scopeId;
        const isMatchingScope =
          hasScope &&
          role.scopeType === context.scopeType &&
          role.scopeId === context.scopeId;
        return isGlobal || isMatchingScope;
      });

    const roleAllow = aggregateAllowBitfields(
      roles
        .filter((r) => r.allowPermissions != null)
        .map((r) => r.getAllowPermissionsAsBigInt()),
    );
    const roleDeny = aggregateDenyBitfields(
      roles
        .filter((r) => r.denyPermissions != null)
        .map((r) => r.getDenyPermissionsAsBigInt()),
    );

    // Process user permissions — filter in memory
    const validUserPermissions = userPermissions.filter((up) => up.isValid());
    const relevantUserPermissions = validUserPermissions.filter((up) => {
      const isGlobal = !up.contextType && !up.contextId;
      const isMatchingScope =
        hasScope &&
        up.contextType === context.scopeType &&
        up.contextId === context.scopeId;
      return isGlobal || isMatchingScope;
    });

    const userAllow = aggregateAllowBitfields(
      relevantUserPermissions
        .filter((up) => up.allowPermissions != null)
        .map((up) => up.getAllowPermissionsAsBigInt()),
    );
    const userDeny = aggregateDenyBitfields(
      relevantUserPermissions
        .filter((up) => up.denyPermissions != null)
        .map((up) => up.getDenyPermissionsAsBigInt()),
    );

    return {
      scopeAllow,
      scopeDeny,
      roleAllow,
      roleDeny,
      userAllow,
      userDeny,
    };
  }

  /**
   * Combine allow permissions with precedence logic
   * @param scopeAllow - Scope allow bitfield
   * @param scopeDeny - Scope deny bitfield
   * @param roleAllow - Role allow bitfield
   * @param roleDeny - Role deny bitfield
   * @param userAllow - User allow bitfield
   * @param userDeny - User deny bitfield
   * @returns Final allow bitfield
   */
  private combineAllowPermissions(
    scopeAllow: bigint,
    scopeDeny: bigint,
    roleAllow: bigint,
    roleDeny: bigint,
    userAllow: bigint,
    userDeny: bigint,
  ): bigint {
    // Scope allow takes precedence (if not denied by scope)
    const scopeEffective = scopeAllow & ~scopeDeny;

    // Role allow (if not denied by scope or role)
    const roleEffective = roleAllow & ~scopeDeny & ~roleDeny;

    // User allow (if not denied by scope, role, or user)
    const userEffective = userAllow & ~scopeDeny & ~roleDeny & ~userDeny;

    // Combine: scope OR role OR user
    return scopeEffective | roleEffective | userEffective;
  }

  /**
   * Invalidate cache for a user's effective permissions
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   */
  async invalidateCache(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(userId, scopeType, scopeId);
    await this.cacheService?.delete(cacheKey);
  }

  /**
   * Invalidate all caches for a user
   * @param userId - User ID
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:${userId}:*`;
    await this.cacheService?.deleteKeysByPattern(pattern);
  }

  /**
   * Invalidate all caches for a scope
   * @param scopeType - Scope type
   * @param scopeId - Scope ID
   */
  async invalidateScopeCache(
    scopeType: string,
    scopeId: string,
  ): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}:*:${scopeType}:${scopeId}`;
    await this.cacheService?.deleteKeysByPattern(pattern);
  }

  /**
   * Get cache key for effective permissions
   * @param userId - User ID
   * @param scopeType - Optional scope type
   * @param scopeId - Optional scope ID
   * @returns Cache key string
   */
  private getCacheKey(
    userId: string,
    scopeType?: string,
    scopeId?: string,
  ): string {
    if (scopeType && scopeId) {
      return `${this.CACHE_PREFIX}:${userId}:${scopeType}:${scopeId}`;
    }
    return `${this.CACHE_PREFIX}:${userId}:global`;
  }
}
