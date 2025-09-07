import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

/**
 * Rate limit scope types
 */
export enum RateLimitScope {
  GLOBAL = 'global',
  ROUTE = 'route',
  USER = 'user',
  ORG = 'org',
  IP = 'ip',
}

/**
 * Rate limit strategy types
 */
export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixedWindow',
  SLIDING_WINDOW = 'slidingWindow',
  TOKEN_BUCKET = 'tokenBucket',
}

/**
 * DTO for creating a new rate limit policy
 */
export class CreateRateLimitPolicyDto {
  @ApiProperty({
    description: 'Policy name (must be unique)',
    example: 'api-read-policy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Whether the policy is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Policy priority (higher number = higher priority)',
    example: 100,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiProperty({
    description: 'Policy scope',
    enum: RateLimitScope,
    example: RateLimitScope.ROUTE,
  })
  @IsEnum(RateLimitScope)
  scope: RateLimitScope;

  @ApiProperty({
    description: 'Route pattern (regex) for route scope',
    example: '^POST:/api/v1/messages$',
    required: false,
  })
  @IsOptional()
  @IsString()
  routePattern?: string;

  @ApiProperty({
    description: 'Rate limiting strategy',
    enum: RateLimitStrategy,
    example: RateLimitStrategy.TOKEN_BUCKET,
    required: false,
  })
  @IsOptional()
  @IsEnum(RateLimitStrategy)
  strategy?: RateLimitStrategy;

  @ApiProperty({
    description: 'Rate limit (for fixed/sliding window)',
    example: 100,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Time window in seconds (for fixed/sliding window)',
    example: 60,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  windowSec?: number;

  @ApiProperty({
    description: 'Burst capacity (for token bucket)',
    example: 20,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  burst?: number;

  @ApiProperty({
    description: 'Refill rate per second (for token bucket)',
    example: 5,
    minimum: 0.1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  refillPerSec?: number;

  @ApiProperty({
    description: 'Additional configuration data',
    example: { userIds: ['user1', 'user2'] },
    required: false,
  })
  @IsOptional()
  extra?: {
    userIds?: string[];
    orgIds?: string[];
    ips?: string[];
    name?: string;
    [key: string]: any;
  };

  @ApiProperty({
    description: 'Policy description',
    example: 'API read operations rate limiting',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating an existing rate limit policy
 */
export class UpdateRateLimitPolicyDto {
  @ApiProperty({
    description: 'Whether the policy is enabled',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Policy priority (higher number = higher priority)',
    example: 150,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiProperty({
    description: 'Policy scope',
    enum: RateLimitScope,
    example: RateLimitScope.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(RateLimitScope)
  scope?: RateLimitScope;

  @ApiProperty({
    description: 'Route pattern (regex) for route scope',
    example: '^GET:/api/v1/users$',
    required: false,
  })
  @IsOptional()
  @IsString()
  routePattern?: string;

  @ApiProperty({
    description: 'Rate limiting strategy',
    enum: RateLimitStrategy,
    example: RateLimitStrategy.FIXED_WINDOW,
    required: false,
  })
  @IsOptional()
  @IsEnum(RateLimitStrategy)
  strategy?: RateLimitStrategy;

  @ApiProperty({
    description: 'Rate limit (for fixed/sliding window)',
    example: 200,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Time window in seconds (for fixed/sliding window)',
    example: 120,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  windowSec?: number;

  @ApiProperty({
    description: 'Burst capacity (for token bucket)',
    example: 30,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  burst?: number;

  @ApiProperty({
    description: 'Refill rate per second (for token bucket)',
    example: 10,
    minimum: 0.1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  refillPerSec?: number;

  @ApiProperty({
    description: 'Additional configuration data',
    example: { userIds: ['user1', 'user2', 'user3'] },
    required: false,
  })
  @IsOptional()
  extra?: {
    userIds?: string[];
    orgIds?: string[];
    ips?: string[];
    name?: string;
    [key: string]: any;
  };

  @ApiProperty({
    description: 'Policy description',
    example: 'Updated API read operations rate limiting',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for testing policy matching
 */
export class TestPolicyMatchDto {
  @ApiProperty({
    description: 'User ID for testing',
    example: 'user_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Organization ID for testing',
    example: 'org_456',
    required: false,
  })
  @IsOptional()
  @IsString()
  orgId?: string;

  @ApiProperty({
    description: 'IP address for testing',
    example: '192.168.1.100',
    required: false,
  })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({
    description: 'Route key for testing',
    example: 'POST:/api/v1/messages',
    required: false,
  })
  @IsOptional()
  @IsString()
  routeKey?: string;

  @ApiProperty({
    description: 'API key for testing',
    example: 'ak_1234567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
