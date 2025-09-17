import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationPriority,
} from 'src/shared/constants';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';

/**
 * DTO for creating broadcast notifications
 */
export class CreateBroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating broadcast notifications
 */
export class UpdateBroadcastNotificationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for querying broadcast notifications
 */
export class QueryBroadcastNotificationsDto extends AdvancedPaginationDto {
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  includeExpired?: boolean;
}
