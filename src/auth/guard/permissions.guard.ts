import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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
import { UserPermissionService } from 'src/permissions/services/user-permission.service';
import { USER_CONSTANTS, UserRole } from 'src/shared/constants';

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
    private readonly userPermissionService: UserPermissionService,
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
   * Extract organizationId from request params, body, or query
   * @param request - Express request object
   * @returns organizationId if found, undefined otherwise
   */
  private extractOrganizationIdFromRequest(
    request: Request,
  ): string | undefined {
    // Priority order: URL params > request body > query params

    // 1. Check URL parameters first (most common case)
    const params = request.params as Record<string, string>;
    if (params.organizationId) {
      return params.organizationId;
    }

    // Check if URL path suggests organization context
    if (params.id && this.isOrganizationContext(request.url)) {
      return params.id;
    }

    // 2. Check request body for organization context
    const body = request.body as Record<string, unknown>;
    if (body && typeof body === 'object') {
      // Direct organizationId field
      if (this.isValidString(body.organizationId)) {
        return body.organizationId;
      }

      // Nested organization object
      if (body.organization && typeof body.organization === 'object') {
        const org = body.organization as Record<string, unknown>;
        if (this.isValidString(org.id)) {
          return org.id;
        }
      }
    }

    // 3. Check query parameters (least common)
    const query = request.query as Record<string, string>;
    if (this.isValidString(query.organizationId)) {
      return query.organizationId;
    }

    return undefined;
  }

  /**
   * Check if URL path suggests organization context
   * @param url - Request URL
   * @returns true if URL suggests organization context
   */
  private isOrganizationContext(url: string): boolean {
    return url.includes('/organizations/') || url.includes('/org/');
  }

  /**
   * Validate if value is a non-empty string
   * @param value - Value to validate
   * @returns true if value is a valid non-empty string
   */
  private isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
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
      // Get organizationId from request if not provided in decorator
      let organizationId = permissionOptions.organizationId;

      // Try to get organizationId from request params or body
      if (!organizationId) {
        organizationId = this.extractOrganizationIdFromRequest(request);
      }

      // Check permissions using cached service
      const hasRequiredPermissions =
        await this.userPermissionService.checkPermissions(
          user.uid,
          {
            all: permissionOptions.all,
            any: permissionOptions.any,
            none: permissionOptions.none,
          },
          organizationId,
        );

      if (!hasRequiredPermissions) {
        const details = {
          userId: user.uid,
          userRole: user.role,
          requiredPermissions: permissionOptions,
          organizationId,
          message: `User ${user.uid} denied access - insufficient permissions`,
        };

        this.logger.warn(
          'Permission check failed - insufficient permissions',
          details,
        );

        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
          details: {
            userId: user.uid,
            requiredPermissions: permissionOptions,
            message: 'Insufficient permissions for this operation',
          },
        });
      }

      this.logger.debug('Permission check passed', {
        userId: user.uid,
        userRole: user.role,
        organizationId,
        requiredPermissions: permissionOptions,
      });

      return true;
    } catch (error) {
      this.handlePermissionError(error, user, permissionOptions);
    }
  }
}
