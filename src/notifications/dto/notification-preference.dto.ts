import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * DTO for creating notification preferences
 */
export class CreateNotificationPreferenceDto {
  @ApiProperty({
    description: 'Type of notification this preference applies to',
    enum: NOTIFICATION_CONSTANTS.TYPES,
    example: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Channel this preference applies to',
    enum: NOTIFICATION_CONSTANTS.CHANNEL,
    example: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsNotEmpty()
  channel: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Whether this notification type is enabled for this channel',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether to send immediately or batch with other notifications',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  batched?: boolean;

  @ApiPropertyOptional({
    description: 'Batch frequency in minutes (only used if batched is true)',
    minimum: 1,
    maximum: 1440,
    example: 60,
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  batchFrequency?: number;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (24-hour format)',
    example: '22:00',
  })
  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (24-hour format)',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Timezone for quiet hours',
    default: 'UTC',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for this preference',
    type: 'object',
    example: { sound: true, vibration: true },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

/**
 * DTO for updating notification preferences
 */
export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({
    description: 'Whether this notification type is enabled for this channel',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether to send immediately or batch with other notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  batched?: boolean;

  @ApiPropertyOptional({
    description: 'Batch frequency in minutes (only used if batched is true)',
    minimum: 1,
    maximum: 1440,
    example: 30,
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  batchFrequency?: number;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (24-hour format)',
    example: '23:00',
  })
  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (24-hour format)',
    example: '09:00',
  })
  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Timezone for quiet hours',
    example: 'Europe/London',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for this preference',
    type: 'object',
    example: { sound: false, vibration: true },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

/**
 * DTO for bulk updating notification preferences
 */
export class BulkUpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Array of preference updates',
    type: [UpdateNotificationPreferenceDto],
  })
  preferences: Array<{
    type: NotificationType;
    channel: NotificationChannel;
    enabled?: boolean;
    batched?: boolean;
    batchFrequency?: number;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    settings?: Record<string, any>;
  }>;
}
