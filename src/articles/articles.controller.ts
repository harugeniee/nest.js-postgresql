import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { Auth } from 'src/common/decorators';
import { AdvancedPaginationDto } from 'src/common/dto/advanced-pagination.dto';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
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
  @TrackEvent('article_view', 'content', 'article')
  // @UseInterceptors(AnalyticsInterceptor)
  findOne(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.findById(id);
  }

  @Patch(':id')
  @TrackEvent('article_update', 'content', 'article')
  @Auth()
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.updateArticle(id, updateArticleDto);
  }

  @Delete(':id')
  @TrackEvent('article_delete', 'content', 'article')
  @Auth()
  remove(@Param('id', new SnowflakeIdPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
