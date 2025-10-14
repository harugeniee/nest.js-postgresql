import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new role
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique name of the role',
    example: 'moderator',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role purpose',
    example: 'Moderates the server and manages user behavior',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission bitmask as string (will be converted to BigInt)',
    example: '268435456', // Example: ADMINISTRATOR permission
    default: '0',
  })
  @IsOptional()
  @IsString()
  permissions?: string;

  @ApiPropertyOptional({
    description:
      'Position of the role in hierarchy (higher = more permissions)',
    example: 5,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    description: 'Hex color for the role',
    example: '#ff0000',
    maxLength: 7,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Whether this role is mentionable by users',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  mentionable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this role is managed by an external service',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  managed?: boolean;

  @ApiPropertyOptional({
    description: 'Icon URL for the role',
    example: 'https://example.com/icon.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Unicode emoji for the role',
    example: '👑',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  unicodeEmoji?: string;
}
