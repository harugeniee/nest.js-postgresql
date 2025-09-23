import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Request,
  HttpStatus,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateOrSetReactionDto } from './dto/create-reaction.dto';
import { QueryReactionsDto } from './dto/query-reactions.dto';
import { BatchCountsDto } from './dto/batch-counts.dto';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @Auth()
  @TrackEvent('reaction_set', 'engagement', 'reaction')
  @UseInterceptors(AnalyticsInterceptor)
  async createOrSetReaction(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateOrSetReactionDto,
  ) {
    const userId = req.user.uid;

    if (dto.action === 'set') {
      return this.reactionsService.set(userId, dto);
    } else if (dto.action === 'unset') {
      return this.reactionsService.unset(userId, dto);
    } else {
      return this.reactionsService.toggle(userId, dto);
    }
  }

  @Delete()
  @Auth()
  async unsetReaction(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateOrSetReactionDto,
  ) {
    const userId = req.user.uid;
    return this.reactionsService.unset(userId, dto);
  }

  @Get()
  @Auth()
  async listReactions(@Query() dto: QueryReactionsDto) {
    return this.reactionsService.list(dto);
  }

  @Get('has')
  @Auth()
  async hasReacted(
    @Request() req: Request & { user: AuthPayload },
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Query('kind') kind: string,
  ) {
    if (!subjectType || !subjectId || !kind) {
      throw new HttpException(
        'subjectType, subjectId, and kind are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = req.user.uid;
    return this.reactionsService.hasReacted(
      userId,
      subjectType,
      subjectId,
      kind,
    );
  }

  @Post('counts')
  @Auth()
  async getCountsBatch(@Body() dto: BatchCountsDto) {
    return this.reactionsService.getCountsBatch(dto);
  }

  @Get('counts')
  @Auth()
  async getCounts(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Query('kinds') kinds?: string,
  ) {
    if (!subjectType || !subjectId) {
      throw new HttpException(
        'subjectType and subjectId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const kindsArray = kinds ? kinds.split(',') : undefined;
    return this.reactionsService.getCounts(subjectType, subjectId, kindsArray);
  }
}
