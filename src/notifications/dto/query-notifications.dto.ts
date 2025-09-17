import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import {
  NOTIFICATION_CONSTANTS,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
} from 'src/shared/constants';

/**
 * DTO for querying notifications
 */
export class QueryNotificationsDto extends AdvancedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NOTIFICATION_CONSTANTS.TYPES,
    example: NOTIFICATION_CONSTANTS.TYPES.ARTICLE_LIKED,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Filter by notification status',
    enum: NOTIFICATION_CONSTANTS.STATUS,
    example: NOTIFICATION_CONSTANTS.STATUS.PENDING,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.STATUS)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Filter by notification priority',
    enum: NOTIFICATION_CONSTANTS.PRIORITY,
    example: NOTIFICATION_CONSTANTS.PRIORITY.HIGH,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Filter by notification channel',
    enum: NOTIFICATION_CONSTANTS.CHANNEL,
    example: NOTIFICATION_CONSTANTS.CHANNEL.EMAIL,
  })
  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by related entity type',
    example: 'article',
  })
  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by related entity ID',
    example: '1234567890123456789',
  })
  @IsString()
  @IsOptional()
  relatedEntityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range - start date (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range - end date (ISO string)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search in title and message',
    example: 'article liked',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'updatedAt', 'sentAt', 'readAt', 'priority', 'type'],
    default: 'createdAt',
  })
  @IsEnum(['createdAt', 'updatedAt', 'sentAt', 'readAt', 'priority', 'type'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
