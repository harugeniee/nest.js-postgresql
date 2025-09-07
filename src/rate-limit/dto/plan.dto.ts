import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new rate limit plan
 */
export class CreatePlanDto {
  @ApiProperty({
    description: 'Plan name (e.g., anonymous, free, pro, enterprise)',
    example: 'pro',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Rate limit per minute',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  limitPerMin: number;

  @ApiProperty({
    description: 'Time to live in seconds',
    example: 60,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  ttlSec?: number;

  @ApiProperty({
    description: 'Plan description',
    example: 'Professional plan with higher limits',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Display order for sorting',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

/**
 * DTO for updating an existing rate limit plan
 */
export class UpdatePlanDto {
  @ApiProperty({
    description: 'Rate limit per minute',
    example: 2000,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limitPerMin?: number;

  @ApiProperty({
    description: 'Time to live in seconds',
    example: 120,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  ttlSec?: number;

  @ApiProperty({
    description: 'Plan description',
    example: 'Updated professional plan',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the plan is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Display order for sorting',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
