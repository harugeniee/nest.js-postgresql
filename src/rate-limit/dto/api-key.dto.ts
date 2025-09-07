import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO for creating a new API key
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key value',
    example: 'ak_1234567890abcdef',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Plan name associated with this API key',
    example: 'pro',
  })
  @IsString()
  plan: string;

  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'Mobile App Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Owner ID (user or organization)',
    example: 'user_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({
    description: 'Whether this API key bypasses rate limiting',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isWhitelist?: boolean;

  @ApiProperty({
    description: 'Expiration date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

/**
 * DTO for updating an existing API key
 */
export class UpdateApiKeyDto {
  @ApiProperty({
    description: 'Plan name associated with this API key',
    example: 'enterprise',
    required: false,
  })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'Updated Mobile App Key',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Owner ID (user or organization)',
    example: 'user_456',
    required: false,
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiProperty({
    description: 'Whether the API key is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Whether this API key bypasses rate limiting',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isWhitelist?: boolean;

  @ApiProperty({
    description: 'Expiration date',
    example: '2025-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}
