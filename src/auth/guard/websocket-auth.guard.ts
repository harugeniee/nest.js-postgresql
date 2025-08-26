import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthGuard } from './auth.guard';
import { AuthPayload } from 'src/common/interface';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/shared/services';
import { ConfigService } from '@nestjs/config';

// Custom interface for WebSocket client with user property
interface WebSocketClient extends Socket {
  user?: AuthPayload;
}

/**
 * WebSocket Authentication Guard
 *
 * This guard extends the existing AuthGuard to authenticate WebSocket connections.
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
   * Extract token from WebSocket handshake auth
   */
  private extractWebSocketToken(client: WebSocketClient): string | undefined {
    // Type assertion to bypass TypeScript strict checking for WebSocket handshake
    const handshake = (client as any)?.handshake;
    const token = handshake?.auth?.token;
    return typeof token === 'string' ? token : undefined;
  }

  /**
   * WebSocket-specific canActivate implementation
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<WebSocketClient>();
    const token = this.extractWebSocketToken(client);

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
      client.user = payload;

      // Run additional verification (cache check, etc.)
      await this.afterVerify(payload);

      return true;
    } catch {
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
  private hasRequiredRoles(userRole: string): boolean {
    if (this.requiredRoles.length === 0) return true;
    return this.requiredRoles.includes(userRole);
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

    const client = context.switchToWs().getClient<WebSocketClient>();
    const user = client.user;

    // Check if user exists and has role
    if (!user || !user.role) {
      throw new WsException({
        messageKey: 'auth.INSUFFICIENT_ROLES',
        message: 'User not authenticated or missing role',
      });
    }

    // Check roles
    if (!this.hasRequiredRoles(user.role)) {
      throw new WsException({
        messageKey: 'auth.INSUFFICIENT_ROLES',
        message: 'Insufficient roles to access this resource',
      });
    }

    // Note: AuthPayload doesn't have permissions field, so we skip permission checking
    // If you need permission checking, extend AuthPayload interface or create a new one

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
  } as new (
    jwtService: JwtService,
    cacheService: CacheService,
    configService: ConfigService,
  ) => WebSocketRoleGuard;
}
