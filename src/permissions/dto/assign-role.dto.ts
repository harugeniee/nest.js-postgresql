import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO for assigning a role to a user
 */
export class AssignRoleDto {
  @ApiProperty({
    description: 'ID of the user to assign the role to',
    example: '1234567890123456789',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'ID of the role to assign',
    example: '9876543210987654321',
  })
  @IsString()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Reason for role assignment (for audit purposes)',
    example: 'User requested moderator role',
  })
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who is assigning this role',
    example: '1111111111111111111',
  })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiPropertyOptional({
    description: 'Whether this role assignment is temporary',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;

  @ApiPropertyOptional({
    description: 'Expiration date for temporary role assignment (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
