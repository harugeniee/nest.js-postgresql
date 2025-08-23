import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { CacheService } from 'src/shared/services';
import { QR_RATE_LIMITS, QR_TTL_DEFAULTS } from '../qr.constants';

/**
 * QR Rate Limit Guard
 *
 * This guard implements rate limiting for QR endpoints to prevent abuse.
 * It tracks requests per IP address and enforces limits based on endpoint type.
 *
 * Rate limits:
 * - CREATE_TICKET: 10 requests per minute per IP
 * - EXCHANGE_GRANT: 5 requests per minute per IP
 * - Other endpoints: 20 requests per minute per IP
 */
@Injectable()
export class QrRateLimitGuard implements CanActivate {
  constructor(private readonly cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const endpoint = this.getEndpointType(request);

    // Get rate limit configuration for this endpoint
    const { limit, window } = this.getRateLimitConfig(endpoint);
    const key = `qr:rate_limit:${endpoint}:${ip}`;

    try {
      // Check current rate limit status
      const rateLimitInfo = await this.cacheService.atomicIncrementWithLimit(
        key,
        limit,
        window,
      );

      // Add rate limit headers to response
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      response.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime);

      // Check if rate limit exceeded
      if (rateLimitInfo.remaining <= 0) {
        const retryAfter = Math.ceil(
          (rateLimitInfo.resetTime - Date.now() / 1000) / 1000,
        );
        response.setHeader('Retry-After', retryAfter);

        throw new HttpException(
          {
            message: 'Rate limit exceeded',
            retryAfter,
            limit,
            window,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis operation fails, allow the request (fail open)
      console.warn('Rate limiting failed, allowing request:', error);
      return true;
    }
  }

  /**
   * Gets the client IP address from the request
   * Handles various proxy scenarios
   */
  private getClientIp(request: Request): string {
    // Check for forwarded IP headers (common with proxies)
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    // Fallback to connection remote address
    return (
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Determines the endpoint type for rate limiting purposes
   */
  private getEndpointType(request: Request): string {
    const { method, path } = request;

    if (method === 'POST' && path === '/qr/tickets') {
      return 'CREATE_TICKET';
    }

    if (method === 'POST' && path === '/qr/auth/qr/grant') {
      return 'EXCHANGE_GRANT';
    }

    return 'OTHER';
  }

  /**
   * Gets rate limit configuration for a specific endpoint type
   */
  private getRateLimitConfig(endpoint: string): {
    limit: number;
    window: number;
  } {
    const configs = {
      CREATE_TICKET: {
        limit: QR_RATE_LIMITS.CREATE_TICKET,
        window: QR_TTL_DEFAULTS.RATE_LIMIT_WINDOW,
      },
      EXCHANGE_GRANT: {
        limit: QR_RATE_LIMITS.EXCHANGE_GRANT,
        window: QR_TTL_DEFAULTS.RATE_LIMIT_WINDOW,
      },
      OTHER: {
        limit: 20, // Default limit for other endpoints
        window: QR_TTL_DEFAULTS.RATE_LIMIT_WINDOW,
      },
    };

    return configs[endpoint] || configs.OTHER;
  }
}
