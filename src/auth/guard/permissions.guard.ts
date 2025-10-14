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
} from 'src/common/decorators/require-permissions.decorator';
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
      });
    }

    try {
      // Check permissions using cached service
      const hasRequiredPermissions =
        await this.userPermissionService.checkPermissions(
          user.uid,
          {
            all: permissionOptions.all,
            any: permissionOptions.any,
            none: permissionOptions.none,
          },
          permissionOptions.organizationId,
        );

      if (!hasRequiredPermissions) {
        this.logger.warn(
          `User ${user.uid} denied access - insufficient permissions`,
          {
            userId: user.uid,
            requiredPermissions: permissionOptions,
          },
        );

        throw new ForbiddenException({
          messageKey: 'auth.FORBIDDEN',
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
