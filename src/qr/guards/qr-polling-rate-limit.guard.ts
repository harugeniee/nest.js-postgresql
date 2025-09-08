import { QR_POLLING_CONFIG } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

/**
 * QR Polling Rate Limit Guard
 *
 * Implements rate limiting for polling endpoints:
 * - 1 request per 2 seconds per IP+ticket combination
 * - Uses Redis for distributed rate limiting
 */
@Injectable()
export class QrPollingRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(QrPollingRateLimitGuard.name);

  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const ip = this.getClientIp(request);
    const ticketId = request.params.ticketId;

    if (!ticketId) {
      return true; // Let other guards handle missing ticketId
    }

    const rateLimitKey = `ratelimit:poll:${ip}:${ticketId}`;
    const windowSeconds = QR_POLLING_CONFIG.RATE_LIMIT_WINDOW_SEC;

    try {
      // Use Redis SET with NX and EX for atomic rate limiting
      const result = await this.cacheService
        .getRedisClient()
        .set(rateLimitKey, '1', 'EX', windowSeconds, 'NX');

      if (!result) {
        // Rate limit exceeded
        this.logger.warn(
          `Rate limit exceeded for polling: IP=${ip}, ticketId=${ticketId}`,
        );

        response.setHeader('Retry-After', windowSeconds);
        throw new HttpException(
          {
            messageKey: 'qr.RATE_LIMIT_EXCEEDED',
            messageArgs: { retryAfter: windowSeconds },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.debug(
        `Rate limit check passed for polling: IP=${ip}, ticketId=${ticketId}`,
      );
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error in polling rate limiting:', error);
      // On error, allow the request but log the issue
      return true;
    }
  }

  /**
   * Extracts client IP address from request
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
