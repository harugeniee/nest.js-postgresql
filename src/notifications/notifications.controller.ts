import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  UpdateNotificationDto,
  QueryNotificationsDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  BulkUpdateNotificationPreferencesDto,
  MarkAsReadDto,
  NotificationStatsDto,
} from './dto';

@Controller('notifications')
@Auth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createNotification(
    @Body() dto: CreateNotificationDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.createNotification(req.user.uid, dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createBulkNotifications(@Body() dto: CreateBulkNotificationDto) {
    return this.notificationsService.createBulkNotifications(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getUserNotifications(
    @Query() query: QueryNotificationsDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.getUserNotifications(req.user.uid, query);
  }

  @Get('with-broadcasts')
  @HttpCode(HttpStatus.OK)
  getUserNotificationsWithBroadcasts(
    @Query() query: QueryNotificationsDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.getUserNotificationsWithBroadcasts(
      req.user.uid,
      query,
    );
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getNotificationStats(
    @Request() req: Request & { user: AuthPayload },
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getUserNotificationStats(req.user.uid);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getNotification(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.findOne(
      { id, userId: req.user.uid },
      { relations: ['user'] },
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  updateNotification(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() dto: UpdateNotificationDto,
    @Request() _req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.update(id, dto);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() dto: MarkAsReadDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.markAsRead(id, req.user.uid, dto);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Request() req: Request & { user: AuthPayload }) {
    return this.notificationsService.markAllAsRead(req.user.uid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNotification(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Request() _req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.remove(id);
  }

  // Notification Preferences endpoints

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  getUserPreferences(@Request() req: Request & { user: AuthPayload }) {
    return this.notificationsService.getUserPreferences(req.user.uid);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.CREATED)
  createPreference(
    @Body() dto: CreateNotificationPreferenceDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.createPreference(req.user.uid, dto);
  }

  @Put('preferences/:id')
  @HttpCode(HttpStatus.OK)
  updatePreference(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() dto: UpdateNotificationPreferenceDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.updatePreference(id, req.user.uid, dto);
  }

  @Put('preferences/bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpdatePreferences(
    @Body() dto: BulkUpdateNotificationPreferencesDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.bulkUpdatePreferences(req.user.uid, dto);
  }

  @Delete('preferences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePreference(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Request() _req: Request & { user: AuthPayload },
  ) {
    return this.notificationsService.remove(id);
  }
}
