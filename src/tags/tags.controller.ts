import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAccessTokenGuard, RolesGuard } from 'src/auth/guard';
import { Roles } from 'src/common/decorators';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, QueryTagsDto, TagStatsDto } from './dto';
import { IPagination } from 'src/common/interface';
import { Tag } from './entities/tag.entity';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: Tag,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Tag slug already exists' })
  create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Tags retrieved successfully',
    type: [Tag],
  })
  findAll(@Query() query: QueryTagsDto): Promise<IPagination<Tag>> {
    return this.tagsService.findAll(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiResponse({
    status: 200,
    description: 'Popular tags retrieved successfully',
    type: [Tag],
  })
  getPopularTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getPopularTags(limit);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending tags' })
  @ApiResponse({
    status: 200,
    description: 'Trending tags retrieved successfully',
    type: [Tag],
  })
  getTrendingTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getTrendingTags(limit);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured tags' })
  @ApiResponse({
    status: 200,
    description: 'Featured tags retrieved successfully',
    type: [Tag],
  })
  getFeaturedTags(@Query('limit') limit?: number): Promise<Tag[]> {
    return this.tagsService.getFeaturedTags(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tags by name or description' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [Tag],
  })
  searchTags(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<Tag[]> {
    return this.tagsService.searchTags(query, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tag statistics' })
  @ApiResponse({
    status: 200,
    description: 'Tag statistics retrieved successfully',
    type: TagStatsDto,
  })
  getStats(): Promise<TagStatsDto> {
    return this.tagsService.getStats();
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get tag suggestions based on content' })
  @ApiResponse({
    status: 200,
    description: 'Tag suggestions retrieved successfully',
    type: [Tag],
  })
  getContentSuggestions(@Query('content') content: string): Promise<Tag[]> {
    return this.tagsService.getContentSuggestions(content);
  }

  @Get('bulk-create')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create tags from array of names' })
  @ApiResponse({
    status: 201,
    description: 'Tags created successfully',
    type: [Tag],
  })
  bulkCreate(@Query('names') names: string): Promise<Tag[]> {
    const tagNames = names
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name);
    return this.tagsService.bulkCreate(tagNames);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag retrieved successfully',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findById(@Param('id', new SnowflakeIdPipe()) id: string): Promise<Tag> {
    return this.tagsService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tag by slug' })
  @ApiResponse({
    status: 200,
    description: 'Tag retrieved successfully',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findBySlug(@Param('slug') slug: string): Promise<Tag> {
    return this.tagsService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  update(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tag (soft delete)' })
  @ApiResponse({ status: 204, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  remove(@Param('id', new SnowflakeIdPipe()) id: string): Promise<void> {
    return this.tagsService.remove(id);
  }

  @Post(':id/usage')
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update tag usage count' })
  @ApiResponse({ status: 204, description: 'Usage count updated successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  updateUsageCount(
    @Param('id', new SnowflakeIdPipe()) id: string,
    @Body('increment') increment: number = 1,
  ): Promise<void> {
    return this.tagsService.updateUsageCount(id, increment);
  }
}
