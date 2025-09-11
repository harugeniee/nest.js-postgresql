import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateOrSetReactionDto } from './dto/create-reaction.dto';
import { QueryReactionsDto } from './dto/query-reactions.dto';
import { BatchCountsDto } from './dto/batch-counts.dto';
import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @UseGuards(JwtAccessTokenGuard)
  async createOrSetReaction(
    @Request() req,
    @Body() dto: CreateOrSetReactionDto,
  ) {
    const userId = req.user.id;

    if (dto.action === 'set') {
      return this.reactionsService.set(userId, dto);
    } else if (dto.action === 'unset') {
      return this.reactionsService.unset(userId, dto);
    } else {
      return this.reactionsService.toggle(userId, dto);
    }
  }

  @Delete()
  @UseGuards(JwtAccessTokenGuard)
  async unsetReaction(@Request() req, @Body() dto: CreateOrSetReactionDto) {
    const userId = req.user.id;
    return this.reactionsService.unset(userId, dto);
  }

  @Get()
  async listReactions(@Query() dto: QueryReactionsDto) {
    return this.reactionsService.list(dto);
  }

  @Get('has')
  @UseGuards(JwtAccessTokenGuard)
  async hasReacted(
    @Request() req,
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: number,
    @Query('kind') kind: string,
  ) {
    if (!subjectType || !subjectId || !kind) {
      throw new HttpException(
        'subjectType, subjectId, and kind are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = req.user.id;
    return this.reactionsService.hasReacted(
      userId,
      subjectType,
      subjectId,
      kind,
    );
  }

  @Post('counts')
  async getCountsBatch(@Body() dto: BatchCountsDto) {
    return this.reactionsService.getCountsBatch(dto);
  }

  @Get('counts')
  async getCounts(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: number,
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
