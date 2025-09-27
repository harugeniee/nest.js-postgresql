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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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
 * DTO for individual preference in bulk update
 */
export class BulkUpdatePreferenceDto {
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
 * DTO for bulk updating notification preferences
 */
export class BulkUpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdatePreferenceDto)
  preferences: BulkUpdatePreferenceDto[];
}
