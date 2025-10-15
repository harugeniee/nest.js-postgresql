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

/**
 * High-performance permission guard using Redis cache
 * Only loads permissions on login, then serves from cache
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly userPermissionService: UserPermissionService,
  ) {}

  /**
   * Extract organizationId from request params, body, or query
   */
  private extractOrganizationIdFromRequest(
    request: Request,
  ): string | undefined {
    // Try to get from URL params first (e.g., /organizations/:id/articles)
    const params = request.params as Record<string, string>;
    if (params.organizationId) {
      return params.organizationId;
    }
    if (params.id && request.url.includes('/organizations/')) {
      return params.id;
    }

    // Try to get from request body
    const body = request.body as Record<string, unknown>;
    if (body && typeof body === 'object') {
      if (body.organizationId && typeof body.organizationId === 'string') {
        return body.organizationId;
      }
      if (body.organization && typeof body.organization === 'object') {
        const org = body.organization as Record<string, unknown>;
        if (org.id && typeof org.id === 'string') {
          return org.id;
        }
      }
    }

    // Try to get from query parameters
    const query = request.query as Record<string, string>;
    if (query.organizationId) {
      return query.organizationId;
    }

    return undefined;
  }

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

    // Get user from request
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthPayload }>();
    const user = request.user;

    if (!user?.uid) {
      this.logger.warn('No user found in request for permission check');
      throw new UnauthorizedException({
        messageKey: 'auth.UNAUTHORIZED',
        details: {
          userId: user.uid,
          message: 'User does not have the required permissions',
        },
      });
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
          requiredPermissions: permissionOptions,
          message: `User ${user.uid} denied access - insufficient permissions`,
        };
        this.logger.warn(details);

        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
          details: details,
        });
      }

      return true;
    } catch (error) {
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
        requiredPermissions: permissionOptions,
      });
      throw new ForbiddenException({
        messageKey: 'auth.FORBIDDEN',
      });
    }
  }
}
