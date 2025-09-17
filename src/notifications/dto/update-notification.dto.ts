import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';
import { IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  NOTIFICATION_CONSTANTS,
  NotificationStatus,
} from 'src/shared/constants';

/**
 * DTO for updating a notification
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({
    description: 'Notification status',
    enum: NOTIFICATION_CONSTANTS.STATUS,
    example: NOTIFICATION_CONSTANTS.STATUS.READ,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.STATUS)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Whether the notification has been read',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when the notification was read (ISO string)',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  readAt?: string;

  @ApiPropertyOptional({
    description: 'Error message if notification failed',
    example: 'SMTP connection timeout',
  })
  @IsOptional()
  errorMessage?: string;
}

/**
 * DTO for marking notification as read
 */
export class MarkAsReadDto {
  @ApiPropertyOptional({
    description: 'Whether to mark as read',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean = true;

  @ApiPropertyOptional({
    description: 'Timestamp when the notification was read (ISO string)',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  readAt?: string;
}
