import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  PermissionCheckOptions,
  REQUIRE_PERMISSIONS_METADATA,
} from 'src/common/decorators/permissions.decorator';
import { AuthPayload } from 'src/common/interface';
import { ContextResolverService } from 'src/permissions/services/context-resolver.service';
import { PermissionEvaluator } from 'src/permissions/services/permission-evaluator.service';
import { PermissionKey } from 'src/permissions/types/permission-key.type';
import { USER_CONSTANTS, UserRole } from 'src/shared/constants';

interface PermissionEvaluatorLike {
  evaluateBatch(
    userId: string,
    permissionKeys: PermissionKey[],
    scopeType?: string,
    scopeId?: string,
  ): Promise<Map<PermissionKey, boolean>>;
}

/**
 * High-performance permission guard using Redis cache
 * Only loads permissions on login, then serves from cache
 *
 * Features:
 * - Cached permission checks for optimal performance
 * - Support for organization-scoped permissions
 * - Admin role bypass for super users
 * - Comprehensive error handling and logging
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  // Admin roles that bypass permission checks
  private readonly ADMIN_ROLES: UserRole[] = [
    USER_CONSTANTS.ROLES.ADMIN,
    USER_CONSTANTS.ROLES.SUPER_ADMIN,
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly contextResolverService: ContextResolverService,
    @Inject(PermissionEvaluator)
    private readonly permissionEvaluator: PermissionEvaluatorLike,
  ) {}

  /**
   * Check if user has admin role that bypasses permission checks
   * @param user - User authentication payload
   * @returns true if user has admin role, false otherwise
   */
  private isAdminUser(user: AuthPayload): boolean {
    return user.role ? this.ADMIN_ROLES.includes(user.role) : false;
  }

  /**
   * Validate user authentication and extract user from request
   * @param request - Express request with user payload
   * @returns validated user payload
   * @throws UnauthorizedException if user is not authenticated
   */
  private validateUser(request: Request & { user: AuthPayload }): AuthPayload {
    const user = request.user;

    // Check if user exists and has required properties
    if (!user || !user.uid || !this.isValidAuthPayload(user)) {
      const userId = user?.uid || 'unknown';
      const userRole = user?.role || 'unknown';
      const hasUser = !!user;
      const hasUid = !!user?.uid;
      const hasSsid = !!user?.ssid;

      if (!hasUser || !hasUid) {
        this.logger.warn('No user found in request for permission check', {
          hasUser,
          userId,
          url: request.url,
          method: request.method,
        });
      } else {
        this.logger.error('Invalid user payload structure', {
          userId,
          hasUid,
          hasSsid,
          userRole,
        });
      }

      throw new UnauthorizedException({
        messageKey: 'auth.UNAUTHORIZED',
        details: {
          userId,
          message:
            hasUser && hasUid
              ? 'Invalid user authentication payload'
              : 'User authentication required for permission check',
        },
      });
    }

    return user;
  }

  /**
   * Type guard to validate AuthPayload structure
   * @param user - User object to validate
   * @returns true if user has valid AuthPayload structure
   */
  private isValidAuthPayload(user: unknown): user is AuthPayload {
    if (typeof user !== 'object' || user === null) {
      return false;
    }

    const userObj = user as Record<string, unknown>;
    return (
      'uid' in userObj &&
      'ssid' in userObj &&
      typeof userObj.uid === 'string' &&
      typeof userObj.ssid === 'string' &&
      userObj.uid.trim().length > 0 &&
      userObj.ssid.trim().length > 0
    );
  }

  /**
   * Handle permission check errors with proper logging and error formatting
   * @param error - The error that occurred
   * @param user - User making the request
   * @param permissionOptions - Required permissions
   * @throws ForbiddenException with formatted error details
   */
  private handlePermissionError(
    error: unknown,
    user: AuthPayload,
    permissionOptions: PermissionCheckOptions,
  ): never {
    if (
      error instanceof ForbiddenException ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }

    this.logger.error('Permission check failed for user', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.uid,
      userRole: user.role,
      requiredPermissions: permissionOptions,
    });

    throw new ForbiddenException({
      messageKey: 'auth.FORBIDDEN',
      details: {
        userId: user.uid,
        message: 'Permission check failed due to system error',
      },
    });
  }

  /**
   * Main guard method that checks if user has required permissions
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - true if access is allowed, false otherwise
   * @throws UnauthorizedException if user is not authenticated
   * @throws ForbiddenException if user lacks required permissions
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from decorator
    const permissionOptions = this.reflector.get<PermissionCheckOptions>(
      REQUIRE_PERMISSIONS_METADATA,
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!permissionOptions) {
      return true;
    }

    // Get and validate user from request
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthPayload }>();
    const user = this.validateUser(request);

    // Admin users bypass all permission checks
    if (this.isAdminUser(user)) {
      this.logger.debug('Admin user bypassed permission check', {
        userId: user.uid,
        userRole: user.role,
        requiredPermissions: permissionOptions,
      });
      return true;
    }

    try {
      // Get permission options from direct all/any/none fields
      const permissionKeys = {
        all: permissionOptions.all,
        any: permissionOptions.any,
        none: permissionOptions.none,
      };

      // If no permissions specified, allow access
      if (
        !permissionKeys.all?.length &&
        !permissionKeys.any?.length &&
        !permissionKeys.none?.length
      ) {
        return true;
      }

      // Always use permission evaluation
      return await this.evaluatePermissions(
        user,
        {
          ...permissionOptions,
        },
        request,
      );
    } catch (error) {
      this.handlePermissionError(error, user, permissionOptions);
    }
  }

  /**
   * Evaluate permissions using PermissionEvaluator batch API.
   * Loads permission sources once for all keys instead of N individual queries.
   */
  private async evaluatePermissions(
    user: AuthPayload,
    permissionOptions: PermissionCheckOptions,
    request: Request,
  ): Promise<boolean> {
    const permissionKeys = {
      all: permissionOptions.all || [],
      any: permissionOptions.any || [],
      none: permissionOptions.none || [],
    };

    // Extract scope from options or request
    let scopeType = permissionOptions.scopeType;
    let scopeId = permissionOptions.scopeId;

    if (permissionOptions.autoDetectScope) {
      const detectedContext =
        await this.contextResolverService.autoDetectContext(request);
      if (detectedContext) {
        scopeType = detectedContext.type;
        scopeId = detectedContext.id;
      }
    }

    if (!scopeType && !scopeId) {
      const legacyOrganizationId =
        'organizationId' in permissionOptions
          ? (permissionOptions as { organizationId?: string }).organizationId
          : undefined;

      if (legacyOrganizationId) {
        scopeType = 'organization';
        scopeId = legacyOrganizationId;
      }
    }

    // Collect all unique keys and evaluate in one batch
    const allKeys = [
      ...new Set([
        ...permissionKeys.all,
        ...permissionKeys.any,
        ...permissionKeys.none,
      ]),
    ];

    if (allKeys.length === 0) return true;

    const results = await this.permissionEvaluator.evaluateBatch(
      user.uid,
      allKeys,
      scopeType,
      scopeId,
    );

    // Check ALL permissions
    if (permissionKeys.all.length > 0) {
      for (const key of permissionKeys.all) {
        if (!results.get(key)) {
          throw new ForbiddenException({
            messageKey: 'auth.FORBIDDEN',
            details: {
              userId: user.uid,
              requiredPermission: key,
              scopeType,
              scopeId,
              message: `Missing required permission: ${key}`,
            },
          });
        }
      }
    }

    // Check ANY permissions
    if (permissionKeys.any.length > 0) {
      const hasAny = permissionKeys.any.some((key) => results.get(key));
      if (!hasAny) {
        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
          details: {
            userId: user.uid,
            requiredPermissions: permissionKeys.any,
            scopeType,
            scopeId,
            message: 'Missing at least one required permission',
          },
        });
      }
    }

    // Check NONE permissions
    if (permissionKeys.none.length > 0) {
      for (const key of permissionKeys.none) {
        if (results.get(key)) {
          throw new ForbiddenException({
            messageKey: 'auth.FORBIDDEN',
            details: {
              userId: user.uid,
              forbiddenPermission: key,
              scopeType,
              scopeId,
              message: `User has forbidden permission: ${key}`,
            },
          });
        }
      }
    }

    this.logger.debug('Permission check passed', {
      userId: user.uid,
      scopeType,
      scopeId,
      requiredPermissions: permissionKeys,
    });

    return true;
  }
}
