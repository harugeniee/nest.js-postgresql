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
  @IsEnum(NOTIFICATION_CONSTANTS.TYPES)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NOTIFICATION_CONSTANTS.STATUS)
  @IsOptional()
  declare status?: NotificationStatus;

  @IsEnum(NOTIFICATION_CONSTANTS.PRIORITY)
  @IsOptional()
  priority?: NotificationPriority;

  @IsEnum(NOTIFICATION_CONSTANTS.CHANNEL)
  @IsOptional()
  channel?: NotificationChannel;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsString()
  @IsOptional()
  relatedEntityType?: string;

  @IsString()
  @IsOptional()
  relatedEntityId?: string;
}
