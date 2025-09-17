import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsUrl,
  IsDateString,
  IsObject,
  IsArray,
} from 'class-validator';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * DTO for creating a new notification
 */
export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsString()
  @IsOptional()
  relatedEntityId?: string;

  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  emailTemplate?: string;

  @IsObject()
  @IsOptional()
  emailTemplateData?: Record<string, any>;

  @IsObject()
  @IsOptional()
  pushData?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxRetries?: number;
}

/**
 * DTO for creating multiple notifications
 */
export class CreateBulkNotificationDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  emailTemplate?: string;

  @IsObject()
  @IsOptional()
  emailTemplateData?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}
