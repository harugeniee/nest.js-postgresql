import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { BroadcastNotificationService } from './broadcast-notification.service';
import {
  CreateBroadcastNotificationDto,
  UpdateBroadcastNotificationDto,
  QueryBroadcastNotificationsDto,
} from './dto/broadcast-notification.dto';

@Controller('broadcast-notifications')
@Auth()
export class BroadcastNotificationController {
  constructor(
    private readonly broadcastService: BroadcastNotificationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createBroadcast(@Body() dto: CreateBroadcastNotificationDto) {
    return this.broadcastService.createBroadcast(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getBroadcasts(@Query() query: QueryBroadcastNotificationsDto) {
    return this.broadcastService.getBroadcasts(query);
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  getActiveBroadcasts() {
    return this.broadcastService.getActiveBroadcasts();
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getBroadcastStats() {
    return this.broadcastService.getBroadcastStats();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getBroadcast(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.broadcastService.findById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  updateBroadcast(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() dto: UpdateBroadcastNotificationDto,
  ) {
    return this.broadcastService.updateBroadcast(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBroadcast(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.broadcastService.remove(id);
  }

  @Post('deactivate-expired')
  @HttpCode(HttpStatus.OK)
  deactivateExpiredBroadcasts() {
    return this.broadcastService.deactivateExpiredBroadcasts();
  }
}
