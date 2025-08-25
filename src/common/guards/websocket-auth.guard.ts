import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { AuthPayload } from 'src/common/interface';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/shared/services';
import { ConfigService } from '@nestjs/config';

/**
 * WebSocket Authentication Guard
 *
 * This guard reuses the existing AuthGuard logic to authenticate WebSocket connections.
 * It extracts JWT tokens from the handshake auth and validates them using the same
 * verification logic as HTTP requests.
 *
 * Usage:
 * - Apply to individual WebSocket handlers using @UseGuards(WebSocketAuthGuard)
 * - Or use in BaseGateway for automatic authentication on connection
 */
@Injectable()
export class WebSocketAuthGuard extends AuthGuard implements CanActivate {
  /**
   * Override the token extraction to work with WebSocket handshake auth
   */
  protected extractToken(context: ExecutionContext): string | undefined {
    const client: Socket = context.switchToHttp().getRequest();
    const token = (client.handshake.auth as { token?: string })?.token;
    return token;
  }

  /**
   * WebSocket-specific canActivate implementation
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToHttp().getRequest();
    const token = this.extractToken(context);

    if (!token) {
      throw new WsException({
        messageKey: 'auth.INVALID_TOKEN',
        message: 'No JWT token provided',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthPayload>(token, {
        secret: this.getSecret(),
      });

      // Attach the authenticated payload to the socket for later use
      (client as any).user = payload;

      // Run additional verification (cache check, etc.)
      await this.afterVerify(payload);

      return true;
    } catch (error) {
      throw new WsException({
        messageKey: 'auth.INVALID_TOKEN',
        message: 'Invalid JWT token',
      });
    }
  }
}

/**
 * WebSocket Authentication Guard with Role-based Access Control
 *
 * Extends the base WebSocketAuthGuard to include role/permission checking
 */
@Injectable()
export class WebSocketRoleGuard extends WebSocketAuthGuard {
  constructor(
    protected readonly jwtService: JwtService,
    protected readonly cacheService: CacheService,
    protected readonly configService: ConfigService,
    private readonly requiredRoles: string[] = [],
    private readonly requiredPermissions: string[] = [],
  ) {
    super(jwtService, cacheService, configService);
  }

  /**
   * Check if user has required roles
   */
  private hasRequiredRoles(userRoles: string[]): boolean {
    if (this.requiredRoles.length === 0) return true;
    return this.requiredRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user has required permissions
   */
  private hasRequiredPermissions(userPermissions: string[]): boolean {
    if (this.requiredPermissions.length === 0) return true;
    return this.requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  /**
   * Enhanced canActivate with role and permission checking
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, authenticate the user
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const client: Socket = context.switchToHttp().getRequest();
    const user = (client as any).user as AuthPayload;

    // Check roles
    if (!this.hasRequiredRoles(user.roles || [])) {
      throw new WsException({
        messageKey: 'auth.INSUFFICIENT_ROLES',
        message: 'Insufficient roles to access this resource',
      });
    }

    // Check permissions
    if (!this.hasRequiredPermissions(user.permissions || [])) {
      throw new WsException({
        messageKey: 'auth.INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access this resource',
      });
    }

    return true;
  }
}

/**
 * Factory function to create WebSocketRoleGuard with specific requirements
 */
export function createWebSocketRoleGuard(
  roles: string[] = [],
  permissions: string[] = [],
) {
  return class extends WebSocketRoleGuard {
    constructor(
      jwtService: JwtService,
      cacheService: CacheService,
      configService: ConfigService,
    ) {
      super(jwtService, cacheService, configService, roles, permissions);
    }
  };
}
