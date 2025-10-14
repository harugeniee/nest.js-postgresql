import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OverwriteTargetType } from '../constants/permissions.constants';

/**
 * DTO for creating or updating a channel permission overwrite
 */
export class CreateOverwriteDto {
  @ApiProperty({
    description: 'ID of the channel this overwrite applies to',
    example: 'channel_123',
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description: 'ID of the role or user this overwrite targets',
    example: 'role_456',
  })
  @IsString()
  targetId: string;

  @ApiProperty({
    description: 'Type of target (role or member)',
    enum: OverwriteTargetType,
    example: OverwriteTargetType.ROLE,
  })
  @IsEnum(OverwriteTargetType)
  targetType: OverwriteTargetType;

  @ApiPropertyOptional({
    description:
      'Permissions to allow (as string, will be converted to BigInt)',
    example: '268435456', // Example: VIEW_CHANNEL permission
    default: '0',
  })
  @IsOptional()
  @IsString()
  allow?: string;

  @ApiPropertyOptional({
    description: 'Permissions to deny (as string, will be converted to BigInt)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  @IsString()
  deny?: string;

  @ApiPropertyOptional({
    description: 'Reason for this overwrite',
    example: 'Private channel for admins only',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
