import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CommentAttachment } from './entities/comment-attachment.entity';
import { CommentMention } from './entities/comment-mention.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { BatchCommentsDto } from './dto/batch-comments.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CacheService, RabbitMQService } from 'src/shared/services';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let dataSource: DataSource;
  let cacheService: CacheService;
  let rabbitMQService: RabbitMQService;

  const mockComment = {
    id: '1',
    userId: '1',
    user: {
      id: '1',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'avatar.jpg',
    },
    subjectType: 'article',
    subjectId: '1',
    parentId: null,
    content: 'This is a test comment',
    type: 'text',
    pinned: false,
    edited: false,
    editedAt: null,
    attachments: [],
    mentions: [],
    metadata: {},
    flags: [],
    visibility: 'public',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Comment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
            })),
            metadata: {
              columns: [{ propertyName: 'deletedAt' }],
            },
            manager: {
              connection: {
                createQueryRunner: jest.fn(() => ({
                  connect: jest.fn(),
                  startTransaction: jest.fn(),
                  commitTransaction: jest.fn(),
                  rollbackTransaction: jest.fn(),
                  release: jest.fn(),
                  manager: {
                    save: jest.fn(),
                    update: jest.fn(),
                    findOne: jest.fn(),
                    delete: jest.fn(),
                  },
                })),
              },
            },
          },
        },
        {
          provide: getRepositoryToken(CommentAttachment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CommentMention),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deleteKeysByPattern: jest.fn(),
          },
        },
        {
          provide: RabbitMQService,
          useValue: {
            sendDataToRabbitMQAsync: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    dataSource = module.get<DataSource>(DataSource);
    cacheService = module.get<CacheService>(CacheService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new comment', async () => {
      const userId = '1';
      const dto: CreateCommentDto = {
        subjectType: 'article',
        subjectId: '1',
        content: 'This is a test comment',
        type: 'text',
        attachments: [],
        mentions: [],
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          save: jest.fn().mockResolvedValue(mockComment),
          update: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);
      jest.spyOn(service as any, 'createEntity').mockResolvedValue(mockComment);
      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      const result = await service.create(userId, dto);

      expect(result).toBeInstanceOf(CommentResponseDto);
      expect(rabbitMQService.sendDataToRabbitMQAsync).toHaveBeenCalledWith(
        'comment_created',
        expect.objectContaining({
          commentId: mockComment.id,
          userId,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
        }),
      );
    });

    it('should create a comment with parent validation', async () => {
      const userId = '1';
      const dto: CreateCommentDto = {
        subjectType: 'article',
        subjectId: '1',
        parentId: 'parent-1',
        content: 'This is a reply',
        type: 'text',
      };

      const parentComment = { ...mockComment, id: 'parent-1' };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(parentComment);
      jest.spyOn(service as any, 'createEntity').mockResolvedValue(mockComment);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          save: jest.fn().mockResolvedValue(mockComment),
          update: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);

      const result = await service.create(userId, dto);

      expect(result).toBeInstanceOf(CommentResponseDto);
    });

    it('should throw error if parent comment not found', async () => {
      const userId = '1';
      const dto: CreateCommentDto = {
        subjectType: 'article',
        subjectId: '1',
        parentId: 'nonexistent',
        content: 'This is a reply',
        type: 'text',
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if parent comment is on different subject', async () => {
      const userId = '1';
      const dto: CreateCommentDto = {
        subjectType: 'article',
        subjectId: '1',
        parentId: 'parent-1',
        content: 'This is a reply',
        type: 'text',
      };

      const parentComment = {
        ...mockComment,
        subjectType: 'post',
        subjectId: '2',
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(parentComment);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a comment', async () => {
      const commentId = '1';
      const userId = '1';
      const dto: UpdateCommentDto = {
        content: 'Updated comment content',
        edited: true,
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(service as any, 'updateEntity').mockResolvedValue(undefined);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          save: jest.fn().mockResolvedValue(mockComment),
          update: jest.fn(),
          delete: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);

      const result = await service.update(commentId, userId, dto);

      expect(result).toBeInstanceOf(CommentResponseDto);
      expect(rabbitMQService.sendDataToRabbitMQAsync).toHaveBeenCalledWith(
        'comment_updated',
        expect.objectContaining({
          commentId,
          userId,
        }),
      );
    });

    it('should throw error if comment not found', async () => {
      const commentId = 'nonexistent';
      const userId = '1';
      const dto: UpdateCommentDto = {
        content: 'Updated comment content',
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(null);

      await expect(service.update(commentId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if user does not own comment', async () => {
      const commentId = '1';
      const userId = '2';
      const dto: UpdateCommentDto = {
        content: 'Updated comment content',
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      await expect(service.update(commentId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a comment', async () => {
      const commentId = '1';
      const userId = '1';

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(service as any, 'softDelete').mockResolvedValue(undefined);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          save: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        });
      });

      jest.spyOn(dataSource, 'transaction').mockImplementation(mockTransaction);

      const result = await service.delete(commentId, userId);

      expect(result).toEqual({ success: true });
      expect(rabbitMQService.sendDataToRabbitMQAsync).toHaveBeenCalledWith(
        'comment_deleted',
        expect.objectContaining({
          commentId,
          userId,
        }),
      );
    });

    it('should throw error if comment not found', async () => {
      const commentId = 'nonexistent';
      const userId = '1';

      jest.spyOn(service as any, 'findOne').mockResolvedValue(null);

      await expect(service.delete(commentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if user does not own comment', async () => {
      const commentId = '1';
      const userId = '2';

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      await expect(service.delete(commentId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('list', () => {
    it('should return paginated comments', async () => {
      const dto: QueryCommentsDto = {
        page: 1,
        limit: 10,
        sortBy: 'recent',
        order: 'DESC',
        subjectType: 'article',
        subjectId: '1',
      };

      const mockResult = {
        result: [mockComment],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
          hasNextPage: false,
        },
      };

      jest.spyOn(service as any, 'listOffset').mockResolvedValue(mockResult);

      const result = await service.list(dto);

      expect(result).toEqual({
        comments: expect.arrayContaining([expect.any(CommentResponseDto)]),
        total: 1,
        hasMore: false,
      });
    });
  });

  describe('getById', () => {
    it('should return a comment by ID', async () => {
      const commentId = '1';
      const options = {
        includeReplies: true,
        includeAttachments: true,
        includeMentions: true,
      };

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      const result = await service.getById(commentId, options);

      expect(result).toBeInstanceOf(CommentResponseDto);
    });

    it('should throw error if comment not found', async () => {
      const commentId = 'nonexistent';
      const options = {};

      jest.spyOn(service as any, 'findOne').mockResolvedValue(null);

      await expect(service.getById(commentId, options)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBatch', () => {
    it('should return comments for multiple subjects', async () => {
      const dto: BatchCommentsDto = {
        subjectType: 'article',
        subjectIds: ['1', '2', '3'],
        includeReplies: false,
        includeAttachments: true,
        includeMentions: true,
      };

      jest.spyOn(service as any, 'find').mockResolvedValue([mockComment]);

      const result = await service.getBatch(dto);

      expect(result).toHaveProperty('1');
      expect(result).toHaveProperty('2');
      expect(result).toHaveProperty('3');
    });
  });

  describe('togglePin', () => {
    it('should pin a comment', async () => {
      const commentId = '1';
      const userId = '1';
      const pinned = true;

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);
      jest.spyOn(service as any, 'updateEntity').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      const result = await service.togglePin(commentId, userId, pinned);

      expect(result).toBeInstanceOf(CommentResponseDto);
      expect(rabbitMQService.sendDataToRabbitMQAsync).toHaveBeenCalledWith(
        'comment_pinned',
        expect.objectContaining({
          commentId,
          userId,
          pinned,
        }),
      );
    });

    it('should throw error if comment not found', async () => {
      const commentId = 'nonexistent';
      const userId = '1';
      const pinned = true;

      jest.spyOn(service as any, 'findOne').mockResolvedValue(null);

      await expect(
        service.togglePin(commentId, userId, pinned),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if user does not own comment', async () => {
      const commentId = '1';
      const userId = '2';
      const pinned = true;

      jest.spyOn(service as any, 'findOne').mockResolvedValue(mockComment);

      await expect(
        service.togglePin(commentId, userId, pinned),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return comment statistics', async () => {
      const subjectType = 'article';
      const subjectId = '1';

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'count').mockResolvedValue(5);

      const result = await service.getStats(subjectType, subjectId);

      expect(result).toEqual({
        totalComments: 5,
        totalReplies: 5,
        pinnedComments: 5,
        recentComments: 5,
      });
    });

    it('should return cached statistics', async () => {
      const subjectType = 'article';
      const subjectId = '1';

      const cachedStats = {
        totalComments: 10,
        totalReplies: 5,
        pinnedComments: 2,
        recentComments: 3,
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedStats);

      const result = await service.getStats(subjectType, subjectId);

      expect(result).toEqual(cachedStats);
    });
  });
});
