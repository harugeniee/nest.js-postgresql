import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.createArticle(createArticleDto);
  }

  @Get()
  findAll(@Query() query: AdvancedPaginationDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  @TrackEvent('article_view', 'content', 'article')
  @UseInterceptors(AnalyticsInterceptor)
  findOne(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.findOne({ id });
  }

  @Patch(':id')
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, updateArticleDto);
  }

  @Delete(':id')
  remove(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
