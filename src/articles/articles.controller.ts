import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, GetArticleDto, UpdateArticleDto } from './dto';

@Controller('articles')
@UseInterceptors(AnalyticsInterceptor)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @Auth()
  create(
    @Body() createArticleDto: CreateArticleDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    Object.assign(createArticleDto, { userId: req.user.uid });
    return this.articlesService.createArticle(createArticleDto);
  }

  @Get()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  findAll(@Query() query: GetArticleDto) {
    return this.articlesService.findAll(query);
  }

  @Get('cursor')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_LIST_CURSOR,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  findAllCursor(@Query() query: CursorPaginationDto) {
    return this.articlesService.findAllCursor(query);
  }

  @Get(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  findOne(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.findById(id);
  }

  @Patch(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, updateArticleDto);
  }

  @Delete(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  remove(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
