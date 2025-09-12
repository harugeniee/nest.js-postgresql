import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  In,
  Not,
  MoreThan,
  IsNull,
} from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Media } from 'src/media/entities/media.entity';
import { CommentMention } from './entities/comment-mention.entity';
import { CommentMedia } from './entities/comment-media.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateCommentMediaItemDto } from './dto/create-comment-media.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { BatchCommentsDto } from './dto/batch-comments.dto';
import { CacheService, RabbitMQService } from 'src/shared/services';
import { BaseService } from 'src/common/services';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { IPagination, IPaginationCursor } from 'src/common/interface';
import { JOB_NAME, CommentType, CommentVisibility } from 'src/shared/constants';
import { COMMENT_CONSTANTS } from 'src/shared/constants/comment.constants';

@Injectable()
export class CommentsService extends BaseService<Comment> {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(CommentMedia)
    private readonly commentMediaRepository: Repository<CommentMedia>,
    @InjectRepository(CommentMention)
    private readonly commentMentionRepository: Repository<CommentMention>,

    private readonly rabbitMQService: RabbitMQService,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Comment>(commentRepository),
      {
        entityName: 'Comment',
        cache: { enabled: true, ttlSec: 300, prefix: 'comments', swrSec: 60 },
        defaultSearchField: 'content',
        relationsWhitelist: {
          user: true,
          parent: true,
          replies: true,
          media: true,
          mentions: { user: true },
        },
        emitEvents: false, // Disable EventEmitter, use RabbitMQ instead
      },
      cacheService,
    );
  }

  /**
   * Define searchable columns for Comment entity
   * @returns Array of searchable column names
   */
  protected getSearchableColumns(): (keyof Comment)[] {
    return ['content', 'subjectType'];
  }

  /**
   * Lifecycle hook: Before creating a comment
   * @param data - Comment data to be created
   * @returns Processed comment data
   */
  protected async beforeCreate(
    data: Partial<Comment>,
  ): Promise<Partial<Comment>> {
    // Validate parent comment if provided
    if (data.parentId) {
      const parentComment = await this.findOne({ id: data.parentId });
      if (!parentComment) {
        throw new HttpException(
          { messageKey: 'comment.PARENT_COMMENT_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        parentComment.subjectType !== data.subjectType ||
        parentComment.subjectId !== data.subjectId
      ) {
        throw new HttpException(
          { messageKey: 'comment.INVALID_PARENT_COMMENT' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return data;
  }

  /**
   * Lifecycle hook: After creating a comment
   * @param comment - Created comment entity
   */
  protected async afterCreate(comment: Comment): Promise<void> {
    // Send event to RabbitMQ
    await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.COMMENT_CREATED,
      {
        commentId: comment.id,
        userId: comment.userId,
        subjectType: comment.subjectType,
        subjectId: comment.subjectId,
        parentId: comment.parentId,
      },
    );

    // Clear related cache
    await this.clearCommentCache(comment.subjectType, comment.subjectId);
  }

  /**
   * Lifecycle hook: Before updating a comment
   * @param id - Comment ID
   * @param patch - Update data
   */
  protected async beforeUpdate(
    id: string,
    patch: Partial<Comment>,
  ): Promise<void> {
    const comment = await this.findOne({ id });
    if (!comment) {
      throw new HttpException(
        { messageKey: 'comment.COMMENT_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if user owns the comment
    if (patch.userId && comment.userId !== patch.userId) {
      throw new HttpException(
        { messageKey: 'comment.UNAUTHORIZED_EDIT' },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Lifecycle hook: After updating a comment
   * @param comment - Updated comment entity
   */
  protected async afterUpdate(comment: Comment): Promise<void> {
    // Send event to RabbitMQ
    await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.COMMENT_UPDATED,
      {
        commentId: comment.id,
        userId: comment.userId,
        subjectType: comment.subjectType,
        subjectId: comment.subjectId,
      },
    );

    // Clear related cache
    await this.clearCommentCache(comment.subjectType, comment.subjectId);
  }

  /**
   * Lifecycle hook: Before deleting a comment
   * @param id - Comment ID
   */
  protected async beforeDelete(id: string): Promise<void> {
    const comment = await this.findOne({ id });
    if (!comment) {
      throw new HttpException(
        { messageKey: 'comment.COMMENT_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Lifecycle hook: After deleting a comment
   * @param id - Comment ID
   */
  protected async afterDelete(id: string): Promise<void> {
    // Send event to RabbitMQ
    await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.COMMENT_DELETED,
      {
        commentId: id,
      },
    );
  }

  /**
   * Create a new comment
   * @param userId - ID of the user creating the comment
   * @param dto - Comment creation data
   * @returns Created comment with relations
   */
  async createComment(userId: string, dto: CreateCommentDto): Promise<Comment> {
    return await this.runInTransaction(async (queryRunner) => {
      // Create the comment using BaseService.create
      const comment = await this.create(
        {
          userId,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          parentId: dto.parentId,
          content: dto.content,
          type: dto.type || COMMENT_CONSTANTS.TYPES.TEXT,
          pinned: dto.pinned || false,
          metadata: dto.metadata,
          flags: dto.flags || [],
          visibility: dto.visibility || COMMENT_CONSTANTS.VISIBILITY.PUBLIC,
        },
        { queryRunner },
      );

      // Process media attachments (including stickers) if provided
      if (dto.media && Array.isArray(dto.media) && dto.media.length > 0) {
        await this.processCommentMedia(comment.id, dto.media, queryRunner);
      }

      // Legacy attachment support (for backward compatibility)
      if (
        dto.attachments &&
        Array.isArray(dto.attachments) &&
        dto.attachments.length > 0
      ) {
        const legacyMedia = dto.attachments.map((attachment) => ({
          kind: 'image' as const,
          mediaId: attachment.mediaId,
          sortValue: 0,
        }));
        await this.processCommentMedia(comment.id, legacyMedia, queryRunner);
      }

      // Process mentions and create mention records
      if (
        dto.mentions &&
        Array.isArray(dto.mentions) &&
        dto.mentions.length > 0
      ) {
        const mentions = dto.mentions.map((mentionDto) => ({
          ...mentionDto,
          commentId: comment.id,
        }));
        await queryRunner.manager.save(CommentMention, mentions);
      }

      // Fetch the complete comment with relations
      const completeComment = await this.findOne(
        { id: comment.id },
        {
          relations: [
            'user',
            'parent',
            'media',
            'media.media',
            'media.sticker',
            'media.sticker.media',
            'mentions',
            'mentions.user',
          ],
        },
      );

      if (!completeComment) {
        throw new HttpException(
          { messageKey: 'comment.COMMENT_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      return completeComment;
    });
  }

  /**
   * Update an existing comment
   * @param commentId - ID of the comment to update
   * @param userId - ID of the user updating the comment
   * @param dto - Comment update data
   * @returns Updated comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    try {
      return await this.runInTransaction(async (queryRunner) => {
        // Update comment fields (exclude attachments and mentions as they are handled separately)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { attachments: _, mentions: __, ...commentData } = dto;
        const updateData: Partial<Comment> = {
          ...commentData,
          userId, // Add userId for permission check in beforeUpdate
          edited: true,
          editedAt: new Date(),
        } as Partial<Comment>;

        // Use BaseService.update which will trigger lifecycle hooks
        await this.update(commentId, updateData, { queryRunner });

        // Update attachments if provided
        if (dto.attachments !== undefined) {
          // Get the comment with current attachments
          const commentWithAttachments = await queryRunner.manager.findOne(
            Comment,
            {
              where: { id: commentId },
              relations: ['attachments'],
            },
          );

          if (commentWithAttachments) {
            // Clear existing attachments
            commentWithAttachments.attachments = [];

            // Add new attachments if provided
            if (
              Array.isArray(dto.attachments) &&
              (dto.attachments as any[]).length > 0
            ) {
              const mediaIds = (
                dto.attachments as Array<{ mediaId: string }>
              ).map((attachmentDto) => attachmentDto.mediaId);
              const mediaFiles = await queryRunner.manager.find(Media, {
                where: { id: In(mediaIds) },
              });

              if (mediaFiles.length !== mediaIds.length) {
                throw new HttpException(
                  {
                    messageKey: 'comment.MEDIA_NOT_FOUND',
                  },
                  HttpStatus.BAD_REQUEST,
                );
              }

              commentWithAttachments.attachments = mediaFiles;
            }

            await queryRunner.manager.save(Comment, commentWithAttachments);
          }
        }

        // Update mentions if provided
        if (dto.mentions !== undefined) {
          // Remove existing mentions
          await queryRunner.manager.delete(CommentMention, { commentId });

          // Create new mentions
          if (
            Array.isArray(dto.mentions) &&
            (dto.mentions as any[]).length > 0
          ) {
            const mentions = (dto.mentions as Array<Record<string, any>>).map(
              (mentionDto) => ({
                ...mentionDto,
                commentId,
              }),
            );
            await queryRunner.manager.save(CommentMention, mentions);
          }
        }

        // Fetch the complete comment with relations
        const completeComment = await this.findOne(
          { id: commentId },
          {
            relations: [
              'user',
              'parent',
              'attachments',
              'mentions',
              'mentions.user',
            ],
          },
        );

        if (!completeComment) {
          throw new HttpException(
            { messageKey: 'comment.COMMENT_NOT_FOUND' },
            HttpStatus.NOT_FOUND,
          );
        }

        return completeComment;
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { messageKey: 'common.INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Soft delete a comment
   * @param commentId - ID of the comment to delete
   * @param userId - ID of the user deleting the comment
   * @returns Deletion result
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    // Check if user owns the comment
    const comment = await this.findOne({ id: commentId, userId });
    if (!comment) {
      throw new HttpException(
        { messageKey: 'comment.UNAUTHORIZED_DELETE' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Use BaseService.softDelete which will trigger lifecycle hooks
    await this.softDelete(commentId);
  }

  /**
   * Get comments with pagination and filtering (Offset-based)
   * @param dto - Query parameters
   * @returns Paginated comments
   */
  async list(dto: QueryCommentsDto): Promise<IPagination<Comment>> {
    const {
      subjectType,
      subjectId,
      parentId,
      userId,
      type,
      pinned,
      edited,
      visibility,
      includeAttachments = true,
      includeMentions = true,
      ...paginationDto
    } = dto;

    // Build where condition
    const whereCondition: FindOptionsWhere<Comment> = {
      visibility:
        (visibility as CommentVisibility) ||
        COMMENT_CONSTANTS.VISIBILITY.PUBLIC,
    };

    if (subjectType) whereCondition.subjectType = subjectType;
    if (subjectId) whereCondition.subjectId = subjectId;
    if (parentId !== undefined) {
      whereCondition.parentId = parentId;
    }
    if (userId) whereCondition.userId = userId;
    if (type) whereCondition.type = type as CommentType;
    if (pinned !== undefined) whereCondition.pinned = pinned;
    if (edited !== undefined) whereCondition.edited = edited;

    // Build relations
    const relations = ['user'];
    if (includeAttachments) relations.push('attachments');
    if (includeMentions) relations.push('mentions', 'mentions.user');

    // Use BaseService.listOffset for pagination
    return await this.listOffset(paginationDto, whereCondition, { relations });
  }

  /**
   * Get comments with cursor-based pagination
   * @param dto - Query parameters with cursor pagination
   * @returns Cursor-paginated comments
   */
  async getCommentsCursor(
    dto: QueryCommentsDto & CursorPaginationDto,
  ): Promise<IPaginationCursor<Comment>> {
    const {
      subjectType,
      subjectId,
      parentId,
      userId,
      type,
      pinned,
      edited,
      visibility,
      includeAttachments = true,
      includeMentions = true,
      ...paginationDto
    } = dto;

    // Build where condition
    const whereCondition: FindOptionsWhere<Comment> = {
      visibility:
        (visibility as CommentVisibility) ||
        COMMENT_CONSTANTS.VISIBILITY.PUBLIC,
    };

    if (subjectType) whereCondition.subjectType = subjectType;
    if (subjectId) whereCondition.subjectId = subjectId;
    if (parentId !== undefined) {
      whereCondition.parentId = parentId;
    }
    if (userId) whereCondition.userId = userId;
    if (type) whereCondition.type = type as CommentType;
    if (pinned !== undefined) whereCondition.pinned = pinned;
    if (edited !== undefined) whereCondition.edited = edited;

    // Build relations
    const relations = ['user'];
    if (includeAttachments) relations.push('attachments');
    if (includeMentions) relations.push('mentions', 'mentions.user');

    // Use BaseService.listCursor for pagination
    return await this.listCursor(
      paginationDto as CursorPaginationDto,
      whereCondition,
      {
        relations,
      },
    );
  }

  /**
   * Get a single comment by ID
   * @param commentId - ID of the comment
   * @param options - Options for including relations
   * @returns Comment with relations
   */
  async getById(
    commentId: string,
    options?: {
      includeReplies?: boolean;
      includeAttachments?: boolean;
      includeMentions?: boolean;
    },
  ): Promise<Comment> {
    const relations = ['user'];
    if (options?.includeReplies) relations.push('replies');
    if (options?.includeAttachments) relations.push('attachments');
    if (options?.includeMentions) {
      relations.push('mentions', 'mentions.user');
    }

    return await this.findById(commentId, { relations });
  }

  /**
   * Get all comments with offset pagination
   * @param paginationDto - Pagination parameters
   * @returns Paginated comments
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Comment>> {
    return this.listOffset(paginationDto);
  }

  /**
   * Get all comments with cursor pagination
   * @param paginationDto - Cursor pagination parameters
   * @returns Cursor-paginated comments
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Comment>> {
    return this.listCursor(paginationDto);
  }

  /**
   * Get comments in batch for multiple subjects
   * @param dto - Batch query parameters
   * @returns Comments grouped by subject
   */
  async getBatch(dto: BatchCommentsDto): Promise<Record<string, Comment[]>> {
    const {
      subjectType,
      subjectIds,
      parentId,
      includeAttachments,
      includeMentions,
      visibility,
    } = dto;

    const whereCondition: FindOptionsWhere<Comment> = {
      subjectType,
      subjectId: In(subjectIds),
      visibility: (visibility as CommentVisibility) || 'public',
    };

    if (parentId !== undefined) {
      whereCondition.parentId = parentId;
    }

    const relations = ['user'];
    if (includeAttachments) relations.push('attachments');
    if (includeMentions) relations.push('mentions', 'mentions.user');

    const comments = await this.commentRepository.find({
      where: whereCondition,
      relations,
      order: { createdAt: 'DESC' },
    });

    // Group comments by subjectId
    const groupedComments: Record<string, Comment[]> = {};
    subjectIds.forEach((subjectId) => {
      groupedComments[subjectId] = [];
    });

    comments.forEach((comment) => {
      groupedComments[comment.subjectId].push(comment);
    });

    return groupedComments;
  }

  /**
   * Pin/unpin a comment
   * @param commentId - ID of the comment
   * @param userId - ID of the user performing the action
   * @param pinned - Whether to pin or unpin
   * @returns Updated comment
   */
  async togglePin(
    commentId: string,
    userId: string,
    pinned: boolean,
  ): Promise<Comment> {
    try {
      const comment = await this.findById(commentId);

      // Check if user owns the comment or has permission to pin
      if (comment.userId !== userId) {
        throw new HttpException(
          { messageKey: 'comment.UNAUTHORIZED_PIN' },
          HttpStatus.FORBIDDEN,
        );
      }

      // Use BaseService.update which will trigger lifecycle hooks
      await this.update(commentId, { pinned });

      // Send event to RabbitMQ
      await this.rabbitMQService.sendDataToRabbitMQAsync(
        JOB_NAME.COMMENT_PINNED,
        {
          commentId,
          userId,
          pinned,
          subjectType: comment.subjectType,
          subjectId: comment.subjectId,
        },
      );

      return await this.findById(commentId, { relations: ['user'] });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { messageKey: 'common.INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comment statistics
   * @param subjectType - Type of subject
   * @param subjectId - ID of subject
   * @returns Comment statistics
   */
  async getStats(
    subjectType: string,
    subjectId: string,
  ): Promise<{
    totalComments: number;
    totalReplies: number;
    pinnedComments: number;
    recentComments: number;
  }> {
    const cacheKey = `comments:stats:${subjectType}:${subjectId}`;
    const cached = (await this.cacheService?.get(cacheKey)) as {
      totalComments: number;
      totalReplies: number;
      pinnedComments: number;
      recentComments: number;
    } | null;
    if (cached) {
      return cached;
    }

    const [totalComments, totalReplies, pinnedComments, recentComments] =
      await Promise.all([
        this.commentRepository.count({
          where: { subjectType, subjectId, parentId: IsNull() },
        }),
        this.commentRepository.count({
          where: { subjectType, subjectId, parentId: Not(IsNull()) },
        }),
        this.commentRepository.count({
          where: { subjectType, subjectId, pinned: true },
        }),
        this.commentRepository.count({
          where: {
            subjectType,
            subjectId,
            createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
          },
        }),
      ]);

    const stats: {
      totalComments: number;
      totalReplies: number;
      pinnedComments: number;
      recentComments: number;
    } = {
      totalComments,
      totalReplies,
      pinnedComments,
      recentComments,
    };

    await this.cacheService?.set(
      cacheKey,
      stats,
      COMMENT_CONSTANTS.CACHE.STATS_TTL_SEC,
    );

    return stats;
  }

  /**
   * Clear comment-related cache
   * @param subjectType - Type of subject
   * @param subjectId - ID of subject
   */
  private async clearCommentCache(
    subjectType: string,
    subjectId: string,
  ): Promise<void> {
    if (!this.cacheService) return;

    await Promise.all([
      this.cacheService.deleteKeysByPattern(
        `comments:*:${subjectType}:${subjectId}:*`,
      ),
      this.cacheService.deleteKeysByPattern(
        `comments:stats:${subjectType}:${subjectId}`,
      ),
    ]);
  }

  /**
   * Update reply count for a comment
   * @param commentId - ID of the comment to update
   * @param increment - Whether to increment (true) or decrement (false) the count
   */
  async updateReplyCount(
    commentId: string,
    increment: boolean = true,
  ): Promise<void> {
    try {
      const updateOperation = increment
        ? { replyCount: () => 'replyCount + 1' }
        : { replyCount: () => 'replyCount - 1' };

      await this.commentRepository.update(commentId, updateOperation);

      // Clear cache for this comment's parent if it exists
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        select: ['parentId', 'subjectType', 'subjectId'],
      });

      if (comment?.parentId) {
        // Clear cache for the parent comment's subject
        await this.clearCommentCache(comment.subjectType, comment.subjectId);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to update reply count for comment ${commentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Recalculate reply count for a comment
   * @param commentId - ID of the comment to recalculate
   */
  async recalculateReplyCount(commentId: string): Promise<void> {
    try {
      const replyCount = await this.commentRepository.count({
        where: { parentId: commentId },
      });

      await this.commentRepository.update(commentId, { replyCount });

      this.logger.log(
        `Recalculated reply count for comment ${commentId}: ${replyCount}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to recalculate reply count for comment ${commentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get comment with reply count
   * @param commentId - ID of the comment
   * @returns Comment with reply count
   */
  async getCommentWithReplyCount(commentId: string): Promise<Comment | null> {
    return this.commentRepository.findOne({
      where: { id: commentId },
      select: ['id', 'replyCount', 'parentId', 'subjectType', 'subjectId'],
    });
  }

  /**
   * Process comment media attachments (including stickers)
   * @param commentId - ID of the comment
   * @param mediaItems - Array of media items to attach
   * @param queryRunner - Database query runner
   */
  private async processCommentMedia(
    commentId: string,
    mediaItems: CreateCommentMediaItemDto[],
    queryRunner: any,
  ): Promise<void> {
    // Limit media items to prevent abuse
    if (mediaItems.length > 10) {
      throw new HttpException(
        {
          messageKey: 'comment.TOO_MANY_MEDIA_ITEMS',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const mediaItem of mediaItems) {
      if (mediaItem.kind === 'sticker') {
        await this.processStickerMedia(commentId, mediaItem, queryRunner);
      } else {
        await this.processRegularMedia(commentId, mediaItem, queryRunner);
      }
    }
  }

  /**
   * Process sticker media attachment
   * @param commentId - ID of the comment
   * @param mediaItem - Sticker media item
   * @param queryRunner - Database query runner
   */
  private async processStickerMedia(
    commentId: string,
    mediaItem: CreateCommentMediaItemDto & { kind: 'sticker' },
    queryRunner: any,
  ): Promise<void> {
    // Import Sticker entity dynamically to avoid circular dependency
    const { Sticker } = await import('src/stickers/entities/sticker.entity');

    // Find the sticker
    const sticker = await queryRunner.manager.findOne(Sticker, {
      where: { id: mediaItem.stickerId },
      relations: ['media'],
    });

    if (!sticker) {
      throw new HttpException(
        {
          messageKey: 'sticker.STICKER_NOT_FOUND',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if sticker is available for use
    if (!sticker.isUsable()) {
      throw new HttpException(
        {
          messageKey: 'sticker.STICKER_NOT_AVAILABLE',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create comment media record with sticker snapshot
    await queryRunner.manager.save(CommentMedia, {
      commentId,
      mediaId: sticker.mediaId,
      kind: 'sticker',
      url: sticker.media.url,
      meta: {
        width: sticker.width,
        height: sticker.height,
        durationMs: sticker.durationMs,
        format: sticker.format,
        isAnimated: sticker.isAnimated(),
      },
      sortValue: mediaItem.sortValue || 0,
      stickerId: sticker.id,
      stickerName: sticker.name,
      stickerTags: sticker.tags,
      stickerFormat: sticker.format,
    });
  }

  /**
   * Process regular media attachment
   * @param commentId - ID of the comment
   * @param mediaItem - Regular media item
   * @param queryRunner - Database query runner
   */
  private async processRegularMedia(
    commentId: string,
    mediaItem: CreateCommentMediaItemDto & {
      kind: 'image' | 'video' | 'audio' | 'document' | 'other';
    },
    queryRunner: any,
  ): Promise<void> {
    // Find the media file
    const media = await queryRunner.manager.findOne(Media, {
      where: { id: mediaItem.mediaId },
    });

    if (!media) {
      throw new HttpException(
        {
          messageKey: 'comment.MEDIA_NOT_FOUND',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create comment media record
    await queryRunner.manager.save(CommentMedia, {
      commentId,
      mediaId: media.id,
      kind: mediaItem.kind,
      url: media.url,
      meta: {
        width: media.width,
        height: media.height,
        duration: media.duration,
        mimeType: media.mimeType,
        size: media.size,
      },
      sortValue: mediaItem.sortValue || 0,
    });
  }
}
