import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsUrl,
  IsDateString,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'ID of the user who will receive this notification',
    example: '1234567890123456789',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NOTIFICATION_CONSTANTS.TYPES,
    example: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    maxLength: NOTIFICATION_CONSTANTS.TITLE_MAX_LENGTH,
    example: 'Your article was liked!',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message/content',
    maxLength: NOTIFICATION_CONSTANTS.MESSAGE_MAX_LENGTH,
    example: 'John Doe liked your article "Getting Started with NestJS"',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NOTIFICATION_CONSTANTS.PRIORITY,
    default: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Notification channel',
    enum: NOTIFICATION_CONSTANTS.CHANNEL,
    default: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Related entity type (what triggered this notification)',
    example: 'article',
  })
  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @ApiPropertyOptional({
    description: 'Related entity ID',
    example: '1234567890123456789',
  })
  @IsString()
  @IsOptional()
  relatedEntityId?: string;

  @ApiPropertyOptional({
    description: 'Action URL for the notification',
    example: 'https://example.com/articles/123',
  })
  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Email template name',
    example: 'like_notification',
  })
  @IsString()
  @IsOptional()
  emailTemplate?: string;

  @ApiPropertyOptional({
    description: 'Email template data',
    type: 'object',
    example: {
      articleTitle: 'Getting Started with NestJS',
      likerName: 'John Doe',
    },
  })
  @IsObject()
  @IsOptional()
  emailTemplateData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Push notification data',
    type: 'object',
    example: { icon: 'like', badge: '1' },
  })
  @IsObject()
  @IsOptional()
  pushData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    example: { source: 'web', version: '1.0.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Scheduled send time (ISO string)',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    minimum: 0,
    maximum: 10,
    default: 3,
  })
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
  @ApiProperty({
    description: 'Array of user IDs to send notifications to',
    type: [String],
    example: ['1234567890123456789', '9876543210987654321'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({
    description: 'Type of notification',
    enum: NOTIFICATION_CONSTANTS.TYPES,
    example: NOTIFICATION_CONSTANTS.TYPES.SYSTEM_ANNOUNCEMENT,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    maxLength: NOTIFICATION_CONSTANTS.TITLE_MAX_LENGTH,
    example: 'System Maintenance Scheduled',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message/content',
    maxLength: NOTIFICATION_CONSTANTS.MESSAGE_MAX_LENGTH,
    example:
      'We will be performing scheduled maintenance on January 1st from 2-4 AM UTC.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NOTIFICATION_CONSTANTS.PRIORITY,
    default: NOTIFICATION_CONSTANTS.PRIORITY.NORMAL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Notification channel',
    enum: NOTIFICATION_CONSTANTS.CHANNEL,
    default: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Action URL for the notification',
    example: 'https://example.com/maintenance',
  })
  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Email template name',
    example: 'system_announcement',
  })
  @IsString()
  @IsOptional()
  emailTemplate?: string;

  @ApiPropertyOptional({
    description: 'Email template data',
    type: 'object',
    example: { maintenanceDate: 'January 1st', duration: '2-4 AM UTC' },
  })
  @IsObject()
  @IsOptional()
  emailTemplateData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    example: { maintenanceId: 'MAINT-2024-001' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Scheduled send time (ISO string)',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}
