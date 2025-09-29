import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
@UseInterceptors(AnalyticsInterceptor)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @TrackEvent('article_create', 'content', 'article')
  @Auth()
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.createArticle(createArticleDto);
  }

  @Get()
  @TrackEvent('article_list', 'content', 'article')
  findAll(@Query() query: AdvancedPaginationDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  @Auth()
  @TrackEvent('article_view', 'content', 'article')
  findOne(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.findById(id);
  }

  @Patch(':id')
  @Auth()
  @TrackEvent('article_update', 'content', 'article')
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, updateArticleDto);
  }

  @Delete(':id')
  @Auth()
  @TrackEvent('article_delete', 'content', 'article')
  remove(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
