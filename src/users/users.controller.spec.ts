import 'reflect-metadata';

import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { AuthPayload } from 'src/common/interface';
import { USER_CONSTANTS } from 'src/shared/constants';

import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    register: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    findAllCursor: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    createSession: jest.Mock;
    findSessionById: jest.Mock;
    revokeSession: jest.Mock;
    revokeSessionsByUserId: jest.Mock;
    updateUser: jest.Mock;
    createDeviceToken: jest.Mock;
    updateDeviceTokenBySessionId: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    listOffset: jest.Mock;
    listCursor: jest.Mock;
    remove: jest.Mock;
    softDelete: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
    removeMany: jest.Mock;
    softDeleteMany: jest.Mock;
    withTransaction: jest.Mock;
    runInTransaction: jest.Mock;
    update: jest.Mock;
    restore: jest.Mock;
  };

  const mockUser: Partial<User> = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    authMethod: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthPayload: AuthPayload = {
    uid: '123',
    ssid: 'session123',
    role: USER_CONSTANTS.ROLES.USER,
  };

  const mockRequest = {
    user: mockAuthPayload,
  } as Request & { user: AuthPayload };

  beforeEach(async () => {
    const mockUsersService = {
      register: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findAllCursor: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createSession: jest.fn(),
      findSessionById: jest.fn(),
      revokeSession: jest.fn(),
      revokeSessionsByUserId: jest.fn(),
      updateUser: jest.fn(),
      createDeviceToken: jest.fn(),
      updateDeviceTokenBySessionId: jest.fn(),
      // BaseService methods
      create: jest.fn(),
      save: jest.fn(),
      listOffset: jest.fn(),
      listCursor: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      removeMany: jest.fn(),
      softDeleteMany: jest.fn(),
      withTransaction: jest.fn(),
      runInTransaction: jest.fn(),
      update: jest.fn(),
      restore: jest.fn(),
    };

    // Create controller directly to avoid guard dependency issues
    controller = new UsersController(
      mockUsersService as unknown as UsersService,
    );
    usersService = mockUsersService;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'Password123',
        username: 'newuser',
      };

      const expectedUser = { ...mockUser, ...registerDto };
      usersService.register.mockResolvedValue(expectedUser as User);

      const result = await controller.register(registerDto);

      expect(usersService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await controller.getMe(mockRequest);

      expect(usersService.findOne).toHaveBeenCalledWith({
        id: mockAuthPayload.uid,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      const paginationDto: AdvancedPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
      };

      const mockPaginationResult = {
        result: [mockUser],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      usersService.findAll.mockResolvedValue(mockPaginationResult as any);

      const result = await controller.getUsers(paginationDto);

      expect(usersService.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockPaginationResult);
    });
  });

  describe('getUsersCursor', () => {
    it('should return cursor-paginated users list', async () => {
      const paginationDto: CursorPaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC',
        cursor: 'cursor123',
      };

      const mockCursorResult = {
        result: [mockUser],
        metaData: {
          nextCursor: 'next123',
          prevCursor: null,
          sortBy: 'createdAt',
        },
      };

      usersService.findAllCursor.mockResolvedValue(mockCursorResult as any);

      const result = await controller.getUsersCursor(paginationDto);

      expect(usersService.findAllCursor).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(mockCursorResult);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const userId = '123';
      usersService.findById.mockResolvedValue(mockUser as User);

      const result = await controller.getUserById(userId);

      expect(usersService?.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });
  });
});
