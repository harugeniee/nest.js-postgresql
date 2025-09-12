import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { BatchCommentsDto } from './dto/batch-comments.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAccessTokenGuard } from 'src/auth/guard';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/shared/services';
import { ConfigService } from '@nestjs/config';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

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

  const mockCommentResponse = new CommentResponseDto(mockComment, {
    includeReplies: false,
    includeAttachments: true,
    includeMentions: true,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            list: jest.fn(),
            getById: jest.fn(),
            getBatch: jest.fn(),
            togglePin: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: JwtAccessTokenGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const req = { user: { uid: '1' } } as any;
      const dto: CreateCommentDto = {
        subjectType: 'article',
        subjectId: '1',
        content: 'This is a test comment',
        type: 'text',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockCommentResponse);

      const result = await controller.createComment(req, dto);

      expect(result).toEqual(mockCommentResponse);
      expect(service.create).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('getComments', () => {
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
        comments: [mockCommentResponse],
        total: 1,
        hasMore: false,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockResult);

      const result = await controller.getComments(dto);

      expect(result).toEqual(mockResult);
      expect(service.list).toHaveBeenCalledWith(dto);
    });
  });

  describe('getComment', () => {
    it('should return a single comment by ID', async () => {
      const commentId = '1';
      const includeReplies = 'true';
      const includeAttachments = 'true';
      const includeMentions = 'true';

      jest.spyOn(service, 'getById').mockResolvedValue(mockCommentResponse);

      const result = await controller.getComment(
        commentId,
        includeReplies,
        includeAttachments,
        includeMentions,
      );

      expect(result).toEqual(mockCommentResponse);
      expect(service.getById).toHaveBeenCalledWith(commentId, {
        includeReplies: true,
        includeAttachments: true,
        includeMentions: true,
      });
    });
  });

  describe('updateComment', () => {
    it('should update a comment', async () => {
      const req = { user: { uid: '1' } } as any;
      const commentId = '1';
      const dto: UpdateCommentDto = {
        content: 'Updated comment content',
        edited: true,
      };

      jest.spyOn(service, 'update').mockResolvedValue(mockCommentResponse);

      const result = await controller.updateComment(commentId, req, dto);

      expect(result).toEqual(mockCommentResponse);
      expect(service.update).toHaveBeenCalledWith(commentId, '1', dto);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const req = { user: { uid: '1' } } as any;
      const commentId = '1';

      jest.spyOn(service, 'delete').mockResolvedValue({ success: true });

      const result = await controller.deleteComment(commentId, req);

      expect(result).toEqual({ success: true });
      expect(service.delete).toHaveBeenCalledWith(commentId, '1');
    });
  });

  describe('togglePin', () => {
    it('should pin/unpin a comment', async () => {
      const req = { user: { uid: '1' } } as any;
      const commentId = '1';
      const body = { pinned: true };

      jest.spyOn(service, 'togglePin').mockResolvedValue(mockCommentResponse);

      const result = await controller.togglePin(commentId, req, body);

      expect(result).toEqual(mockCommentResponse);
      expect(service.togglePin).toHaveBeenCalledWith(commentId, '1', true);
    });
  });

  describe('getCommentsBatch', () => {
    it('should return comments for multiple subjects', async () => {
      const dto: BatchCommentsDto = {
        subjectType: 'article',
        subjectIds: ['1', '2', '3'],
        includeReplies: false,
        includeAttachments: true,
        includeMentions: true,
      };

      const mockResult = {
        '1': [mockCommentResponse],
        '2': [],
        '3': [],
      };

      jest.spyOn(service, 'getBatch').mockResolvedValue(mockResult);

      const result = await controller.getCommentsBatch(dto);

      expect(result).toEqual(mockResult);
      expect(service.getBatch).toHaveBeenCalledWith(dto);
    });
  });

  describe('getCommentStats', () => {
    it('should return comment statistics', async () => {
      const subjectType = 'article';
      const subjectId = '1';

      const mockStats = {
        totalComments: 10,
        totalReplies: 5,
        pinnedComments: 2,
        recentComments: 3,
      };

      jest.spyOn(service, 'getStats').mockResolvedValue(mockStats);

      const result = await controller.getCommentStats(subjectType, subjectId);

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(subjectType, subjectId);
    });
  });

  describe('getCommentReplies', () => {
    it('should return replies for a comment', async () => {
      const commentId = '1';
      const dto: Omit<QueryCommentsDto, 'parentId'> = {
        page: 1,
        limit: 10,
        sortBy: 'recent',
        order: 'DESC',
      };

      const mockResult = {
        comments: [mockCommentResponse],
        total: 1,
        hasMore: false,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockResult);

      const result = await controller.getCommentReplies(commentId, dto);

      expect(result).toEqual(mockResult);
      expect(service.list).toHaveBeenCalledWith({
        ...dto,
        parentId: commentId,
      });
    });
  });

  describe('getCommentsByUser', () => {
    it('should return comments by user', async () => {
      const userId = '1';
      const dto: Omit<QueryCommentsDto, 'userId'> = {
        page: 1,
        limit: 10,
        sortBy: 'recent',
        order: 'DESC',
      };

      const mockResult = {
        comments: [mockCommentResponse],
        total: 1,
        hasMore: false,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockResult);

      const result = await controller.getCommentsByUser(userId, dto);

      expect(result).toEqual(mockResult);
      expect(service.list).toHaveBeenCalledWith({
        ...dto,
        userId,
      });
    });
  });

  describe('searchComments', () => {
    it('should search comments', async () => {
      const query = 'test search';
      const dto: Omit<QueryCommentsDto, 'search'> = {
        page: 1,
        limit: 10,
        sortBy: 'recent',
        order: 'DESC',
      };

      const mockResult = {
        comments: [mockCommentResponse],
        total: 1,
        hasMore: false,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockResult);

      const result = await controller.searchComments(query, dto);

      expect(result).toEqual(mockResult);
      expect(service.list).toHaveBeenCalledWith({
        ...dto,
        search: query.trim(),
      });
    });
  });
});
