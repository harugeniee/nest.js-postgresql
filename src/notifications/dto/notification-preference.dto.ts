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
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * DTO for creating notification preferences
 */
export class CreateNotificationPreferenceDto {
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsNotEmpty()
  channel: NotificationChannel;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  batched?: boolean;

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  batchFrequency?: number;

  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

/**
 * DTO for updating notification preferences
 */
export class UpdateNotificationPreferenceDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  batched?: boolean;

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsOptional()
  batchFrequency?: number;

  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

/**
 * DTO for bulk updating notification preferences
 */
export class BulkUpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
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
