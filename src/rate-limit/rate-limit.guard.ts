/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  ExecutionContext,
  Logger,
  CanActivate,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

import { RateLimitService } from './rate-limit.service';
import { RateLimitContext, RateLimitOverride } from '../common/interface';
import { RATE_LIMIT_OVERRIDE_KEY } from './rate-limit.decorator';

/**
 * Simple Rate Limit Guard
 * Uses the unified RateLimitService for all rate limiting logic
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Main guard execution
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req, res } = this.getReqRes(context);

    try {
      // Check for bypass decorator
      const override = this.getRateLimitOverride(context);
      if (override?.bypass) {
        this.logger.debug('Rate limiting bypassed by decorator');
        return true;
      }

      // Build request context
      const rateLimitContext = this.buildRateLimitContext(req, override);

      // Check rate limit
      const result =
        await this.rateLimitService.checkRateLimit(rateLimitContext);

      // Set response headers
      this.setResponseHeaders(res, result.headers);

      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${rateLimitContext.ip} on ${rateLimitContext.routeKey}`,
        );
        throw new HttpException(
          {
            messageKey: 'auth.RATE_LIMIT_EXCEEDED',
            messageArgs: { retryAfter: result.retryAfter || 60 },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.debug(
        `Rate limit check passed for ${rateLimitContext.ip} on ${rateLimitContext.routeKey}`,
      );

      return true;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error in rate limiting:', error);
      // On error, allow the request but log the issue
      return true;
    }
  }

  /**
   * Extract request and response objects from execution context
   */
  private getReqRes(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Request>(),
      res: http.getResponse<Response>(),
    };
  }

  /**
   * Get rate limit override from decorator
   */
  private getRateLimitOverride(context: ExecutionContext): any {
    return this.reflector.get(RATE_LIMIT_OVERRIDE_KEY, context.getHandler());
  }

  /**
   * Build rate limit context from request
   */
  private buildRateLimitContext(
    req: Request,
    override?: RateLimitOverride,
  ): RateLimitContext {
    const user = (req as any)?.user as
      | { id?: string; orgId?: string }
      | undefined;
    const userId = user?.id;
    const orgId = user?.orgId;
    const ip = this.getClientIp(req);
    const routeKey = override?.routeKey || this.getRouteKey(req);
    const apiKey = this.getApiKey(req);

    return {
      userId,
      orgId,
      ip,
      routeKey,
      apiKey,
    };
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp.trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Generate route key for rate limiting
   */
  private getRouteKey(req: Request): string {
    const method = req.method.toUpperCase();
    const path = (req as any)?.route?.path || req.originalUrl || req.url || '';
    const cleanPath = typeof path === 'string' ? path.split('?')[0] : '';

    // Normalize path to group similar routes
    const normalizedPath = cleanPath
      .replace(/\/\d+/g, '/:id')
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      );

    return `${method}:${normalizedPath}`;
  }

  /**
   * Extract API key from request headers
   */
  private getApiKey(req: Request): string | undefined {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) return apiKey;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (authHeader?.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  /**
   * Set rate limit headers on response
   */
  private setResponseHeaders(
    res: Response,
    headers: Record<string, string>,
  ): void {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}
