import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

export interface ClientInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
}

/**
 * Decorator to extract client information from request
 * Usage: @ClientInfo() clientInfo: ClientInfo
 */
export const ClientInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest();

    // Get user agent
    const userAgent = request.headers['user-agent'];

    // Get real IP address (support proxy/load balancer)
    const ipAddress = getRealIpAddress(request);

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent);

    return {
      userAgent,
      ipAddress,
      ...deviceInfo,
    };
  },
);

/**
 * Get real IP address from request headers
 */
function getRealIpAddress(request: Request): string {
  // Check for various IP headers (for proxy/load balancer scenarios)
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of ipHeaders) {
    const value = request.headers[header];
    if (value && typeof value === 'string') {
      // Handle comma-separated IPs (take the first one)
      const ip = value.split(',')[0].trim();
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address
  return (
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.ip ||
    'unknown'
  );
}

/**
 * Parse user agent string to extract device information
 */
function parseUserAgent(userAgent?: string): {
  deviceType: string;
  browser: string;
  operatingSystem: string;
} {
  if (!userAgent) {
    return {
      deviceType: 'unknown',
      browser: 'unknown',
      operatingSystem: 'unknown',
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'desktop';
  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone')
  ) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
  } else if (ua.includes('opera')) {
    browser = 'Opera';
  }

  // Detect operating system
  let operatingSystem = 'unknown';
  if (ua.includes('windows')) {
    operatingSystem = 'Windows';
  } else if (ua.includes('mac os')) {
    operatingSystem = 'macOS';
  } else if (ua.includes('linux')) {
    operatingSystem = 'Linux';
  } else if (ua.includes('android')) {
    operatingSystem = 'Android';
  } else if (
    ua.includes('ios') ||
    ua.includes('iphone') ||
    ua.includes('ipad')
  ) {
    operatingSystem = 'iOS';
  }

  return {
    deviceType,
    browser,
    operatingSystem,
  };
}

/**
 * Validate IP address format
 */
function isValidIp(ip: string): boolean {
  // Simple IPv4 validation
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // Simple IPv6 validation
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
