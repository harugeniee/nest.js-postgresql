import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from './app.service';
import {
  BypassRateLimit,
  UsePlan,
  CustomRateLimit,
  RateLimit,
} from './rate-limit/rate-limit.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('5')
  @BypassRateLimit() // Health check endpoint - bypass rate limiting
  getHello() {
    return this.appService.getHello();
  }

  @Get('demo')
  @Version('1')
  @UsePlan('free') // Use free plan for demo endpoint
  getDemo() {
    return {
      message: 'This is a demo endpoint with free plan rate limiting',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('heavy')
  @Version('1')
  @CustomRateLimit(5, 300) // 5 requests per 5 minutes
  getHeavyOperation() {
    return {
      message: 'This is a heavy operation with custom rate limiting',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('advanced')
  @Version('1')
  @RateLimit({ policy: 'api-read', keyBy: ['ip', 'route'] })
  getAdvancedDemo() {
    return {
      message: 'This endpoint uses advanced policy-based rate limiting',
      timestamp: new Date().toISOString(),
      features: [
        'Policy-based configuration',
        'Multiple strategies (fixed window, sliding window, token bucket)',
        'Flexible key generation',
        'Hot-reload support',
      ],
    };
  }

  @Get('token-bucket')
  @Version('1')
  @RateLimit({ policy: 'api-write', keyBy: ['userId', 'route'] })
  getTokenBucketDemo() {
    return {
      message: 'This endpoint uses token bucket strategy for burst handling',
      timestamp: new Date().toISOString(),
      strategy: 'token-bucket',
      benefits: [
        'Burst-friendly',
        'Smooth rate limiting',
        'Better for write operations',
      ],
    };
  }
}
