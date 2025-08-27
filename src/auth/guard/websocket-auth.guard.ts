import { Socket } from 'socket.io';
import { AuthPayload } from 'src/common/interface';

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { AuthGuard } from './auth.guard';

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
  private extractWebSocketToken(client: Socket): string | undefined {
    let token: string | undefined = client?.handshake?.auth?.token as string;

    if (!token) {
      const authHeader = client?.handshake?.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      token = client?.handshake?.query?.token as string;
    }

    return typeof token === 'string' ? token : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractWebSocketToken(client);

    if (!token) {
      throw new WsException({
        messageKey: 'auth.INVALID_TOKEN',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthPayload>(token, {
        secret: this.getSecret(),
      });

      Object.assign(client, { user: payload });

      await this.afterVerify(payload);

      return true;
    } catch {
      throw new WsException({
        messageKey: 'auth.INVALID_TOKEN',
      });
    }
  }
}
