import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';
import { IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import {
  NOTIFICATION_CONSTANTS,
  NotificationStatus,
} from 'src/shared/constants';

/**
 * DTO for updating a notification
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsEnum(NOTIFICATION_CONSTANTS.STATUS)
  @IsOptional()
  status?: NotificationStatus;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsDateString()
  @IsOptional()
  readAt?: string;

  @IsOptional()
  errorMessage?: string;
}

/**
 * DTO for marking notification as read
 */
export class MarkAsReadDto {
  @IsBoolean()
  @IsOptional()
  isRead?: boolean = true;

  @IsDateString()
  @IsOptional()
  readAt?: string;
}
