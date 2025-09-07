import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIP } from 'class-validator';

/**
 * DTO for creating a new IP whitelist entry
 */
export class CreateIpWhitelistDto {
  @ApiProperty({
    description: 'IP address to whitelist',
    example: '192.168.1.100',
  })
  @IsIP()
  ip: string;

  @ApiProperty({
    description: 'Description of why this IP is whitelisted',
    example: 'Office network',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Reason for whitelisting',
    example: 'Internal service',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating an existing IP whitelist entry
 */
export class UpdateIpWhitelistDto {
  @ApiProperty({
    description: 'Description of why this IP is whitelisted',
    example: 'Updated office network',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the IP whitelist entry is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Reason for whitelisting',
    example: 'Updated internal service',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
