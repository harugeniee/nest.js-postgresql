import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// Import enums from the main policy DTO file to avoid conflicts
import { RateLimitScope, RateLimitStrategy } from './rate-limit-policy.dto';

/**
 * Extra configuration for policies
 */
export class PolicyExtraDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orgIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ips?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(10)
  weight?: number;

  @IsBoolean()
  @IsOptional()
  whitelist?: boolean;

  [key: string]: unknown;
}

/**
 * DTO for creating a new rate limit policy
 */
export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1000)
  priority?: number = 100;

  @IsEnum(RateLimitScope)
  scope!: RateLimitScope;

  @IsString()
  @IsOptional()
  routePattern?: string;

  @IsEnum(RateLimitStrategy)
  @IsOptional()
  strategy?: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000000)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3600)
  windowSec?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10000)
  burst?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(1000)
  refillPerSec?: number;

  @ValidateNested()
  @Type(() => PolicyExtraDto)
  @IsOptional()
  extra?: PolicyExtraDto;

  @IsString()
  @IsOptional()
  description?: string;
}
