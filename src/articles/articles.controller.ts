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
import { Auth, RequirePermissions } from 'src/common/decorators';
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
  @RequirePermissions({ all: ['ARTICLE_CREATE'] })
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
  @RequirePermissions({
    any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
    none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
  })
  findAll(@Query() query: GetArticleDto) {
    return this.articlesService.findAll(query);
  }

  @Get('cursor')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_LIST_CURSOR,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @RequirePermissions({
    any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
    none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
  })
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
  @RequirePermissions({
    any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
    none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
  })
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
  @RequirePermissions({
    all: ['ARTICLE_EDIT'],
    any: ['ARTICLE_MANAGE_ALL'], // Admin có thể edit tất cả bài viết
  })
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, updateArticleDto);
  }

  @Patch(':id/publish')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @RequirePermissions({
    all: ['ARTICLE_PUBLISH'],
    any: ['ARTICLE_MANAGE_ALL'], // Admin có thể publish tất cả bài viết
  })
  publish(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.updateArticle(id, { status: 'published' });
  }

  @Patch(':id/unpublish')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @RequirePermissions({
    all: ['ARTICLE_PUBLISH'],
    any: ['ARTICLE_MANAGE_ALL'], // Admin có thể unpublish tất cả bài viết
  })
  unpublish(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.updateArticle(id, { status: 'draft' });
  }

  @Delete(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ARTICLE_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.CONTENT,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ARTICLE,
  )
  @RequirePermissions({
    all: ['ARTICLE_DELETE'],
    any: ['ARTICLE_MANAGE_ALL'], // Admin có thể xóa tất cả bài viết
  })
  remove(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
