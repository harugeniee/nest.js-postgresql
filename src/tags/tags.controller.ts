import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, QueryTagsDto, TagStatsDto } from './dto';
import { IPagination } from 'src/common/interface';
import { Tag } from './entities/tag.entity';
import { USER_CONSTANTS } from 'src/shared/constants/user.constants';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @Auth([USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR])
  create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll(@Query() query: QueryTagsDto): Promise<IPagination<Tag>> {
    return this.tagsService.findAll(query);
  }

  @Get('popular')
  getPopularTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getPopularTags(limit);
  }

  @Get('trending')
  getTrendingTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getTrendingTags(limit);
  }

  @Get('featured')
  getFeaturedTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getFeaturedTags(limit);
  }

  @Get('stats')
  getStats(): Promise<TagStatsDto> {
    return this.tagsService.getStats();
  }

  @Get('suggestions')
  getContentSuggestions(@Query('content') content: string): Promise<Tag[]> {
    return this.tagsService.getContentSuggestions(content);
  }

  @Get('bulk-create')
  @Auth([USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR])
  bulkCreate(@Query('names') names: string): Promise<Tag[]> {
    const tagNames = names
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name);
    return this.tagsService.bulkCreate(tagNames);
  }

  @Get(':id')
  findById(@Param('id', new SnowflakeIdPipe()) id: string): Promise<Tag> {
    return this.tagsService.findById(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string): Promise<Tag> {
    return this.tagsService.findBySlug(slug);
  }

  @Patch(':id')
  @Auth([USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR])
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @Auth([USER_CONSTANTS.ROLES.ADMIN])
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new SnowflakeIdPipe()) id: string): Promise<void> {
    return this.tagsService.remove(id);
  }

  @Post(':id/usage')
  @Auth([USER_CONSTANTS.ROLES.ADMIN, USER_CONSTANTS.ROLES.MODERATOR])
  @HttpCode(HttpStatus.NO_CONTENT)
  updateUsageCount(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body('increment') increment: number = 1,
  ): Promise<void> {
    return this.tagsService.updateUsageCount(id, increment);
  }
}
