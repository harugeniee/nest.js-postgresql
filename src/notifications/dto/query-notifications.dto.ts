import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
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
  declare status?: NotificationStatus;

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
}
