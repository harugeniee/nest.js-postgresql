import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { CommentsService } from './comments.service';
import {
  BatchCommentsDto,
  CommentStatsOverviewDto,
  QueryCommentsCursorDto,
} from './dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment
   * POST /comments
   */
  @Post()
  @Auth()
  @TrackEvent('comment_create', 'engagement', 'comment')
  @UseInterceptors(AnalyticsInterceptor)
  async createComment(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user.uid;
    return this.commentsService.createComment(userId, dto);
  }

  /**
   * Get comments with pagination and filtering
   * GET /comments
   */
  @Get()
  @Auth()
  async getComments(@Query() dto: QueryCommentsDto) {
    return this.commentsService.list(dto);
  }

  /**
   * Get comments with cursor-based pagination
   * Better for real-time feeds and infinite scroll
   * IMPORTANT: This route must be defined BEFORE @Get(':id') to avoid route conflicts
   * @param dto Cursor pagination parameters with comment filters
   * @returns Cursor-paginated list of comments
   */
  @Get('cursor')
  // @Auth()
  async getCommentsCursor(@Query() dto: QueryCommentsCursorDto) {
    return this.commentsService.getCommentsCursor(dto);
  }

  /**
   * Get comment statistics overview
   * Returns comprehensive platform-wide statistics about comments including counts by type,
   * visibility, subject type, media attachments, mentions, and top commented subjects
   * IMPORTANT: This route must be defined BEFORE @Get('stats') to avoid route conflicts
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get comment statistics overview',
    description:
      'Returns comprehensive platform-wide statistics about comments including counts by type, visibility, subject type, media attachments, mentions, and top commented subjects',
  })
  async getCommentStatisticsOverview(): Promise<CommentStatsOverviewDto> {
    return this.commentsService.getCommentStatisticsOverview();
  }

  /**
   * Get comment statistics for a subject
   * IMPORTANT: This route must be defined BEFORE @Get(':id') to avoid route conflicts
   * GET /comments/stats
   */
  @Get('stats')
  async getCommentStats(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
  ) {
    if (!subjectType || !subjectId) {
      throw new HttpException(
        'subjectType and subjectId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commentsService.getStats(subjectType, subjectId);
  }

  /**
   * Get comments for multiple subjects in batch
   * POST /comments/batch
   */
  @Post('batch')
  async getCommentsBatch(@Body() dto: BatchCommentsDto) {
    return this.commentsService.getBatch(dto);
  }

  /**
   * Get replies for a specific comment
   * IMPORTANT: This route must be defined BEFORE @Get(':id') to avoid route conflicts
   * GET /comments/:id/replies
   */
  @Get(':id/replies')
  async getCommentReplies(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Query() dto: Omit<QueryCommentsDto, 'parentId'>,
  ) {
    const queryDto: QueryCommentsDto = {
      ...dto,
      parentId: commentId,
    };

    return this.commentsService.list(queryDto);
  }

  /**
   * Pin/unpin a comment
   * POST /comments/:id/pin
   */
  @Post(':id/pin')
  @Auth()
  async togglePin(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { pinned: boolean },
  ) {
    const userId = req.user.uid;
    return this.commentsService.togglePin(commentId, userId, body.pinned);
  }

  /**
   * Get a single comment by ID
   * IMPORTANT: This route must be defined LAST among all GET routes to avoid conflicts
   * GET /comments/:id
   */
  @Get(':id')
  async getComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Query('includeReplies') includeReplies?: string,
    @Query('includeAttachments') includeAttachments?: string,
    @Query('includeMentions') includeMentions?: string,
  ) {
    const options = {
      includeReplies: includeReplies === 'true',
      includeAttachments: includeAttachments !== 'false', // Default to true
      includeMentions: includeMentions !== 'false', // Default to true
    };

    return this.commentsService.getById(commentId, options);
  }

  /**
   * Update a comment
   * PUT /comments/:id
   */
  @Put(':id')
  @Auth()
  async updateComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: UpdateCommentDto,
  ) {
    const userId = req.user.uid;
    return this.commentsService.updateComment(commentId, userId, dto);
  }

  /**
   * Delete a comment (soft delete)
   * DELETE /comments/:id
   */
  @Delete(':id')
  @Auth()
  async deleteComment(
    @Param('id', new SnowflakeIdPipe()) commentId: string,
    @Request() req: Request & { user: AuthPayload },
  ) {
    const userId = req.user.uid;
    return this.commentsService.deleteComment(commentId, userId);
  }
}
