/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-sessions.entity';
import { UserDeviceToken } from './entities/user-device-tokens.entity';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { UserSessionsService } from './services/user-sessions.service';
import { UserDeviceTokensService } from './services/user-device-tokens.service';
import { RegisterDto } from './dto/register.dto';
import { CreateSessionDto } from './dto/session.dto';
import { CreateDeviceTokenDto } from './dto/create-device-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USER_CONSTANTS } from 'src/shared/constants';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let module: TestingModule;
  let userRepository: jest.Mocked<Repository<User>>;
  let userSessionRepository: jest.Mocked<Repository<UserSession>>;
  let userDeviceTokenRepository: jest.Mocked<Repository<UserDeviceToken>>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser: Partial<User> = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    authMethod: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserSession: Partial<UserSession> = {
    id: 'session123',
    userId: '123',
    revoked: false,
    createdAt: new Date(),
  };

  const mockUserDeviceToken: Partial<UserDeviceToken> = {
    id: 'token123',
    userId: '123',
    sessionId: 'session123',
    token: 'device-token-123',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      metadata: {
        columns: [
          { propertyName: 'id' },
          { propertyName: 'email' },
          { propertyName: 'username' },
          { propertyName: 'password' },
          { propertyName: 'createdAt' },
          { propertyName: 'updatedAt' },
        ],
      },
    };

    const mockUserSessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockUserDeviceTokenRepo = {
      upsert: jest.fn(),
      update: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deleteKeysByPattern: jest.fn(),
      deleteKeysBySuffix: jest.fn(),
    };

    const mockUserSessionsService = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      revoke: jest.fn(),
      revokeByUserId: jest.fn(),
    };

    const mockUserDeviceTokensService = {
      create: jest.fn(),
      updateBySessionId: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockUserSessionRepo,
        },
        {
          provide: getRepositoryToken(UserDeviceToken),
          useValue: mockUserDeviceTokenRepo,
        },
        {
          provide: UserSessionsService,
          useValue: mockUserSessionsService,
        },
        {
          provide: UserDeviceTokensService,
          useValue: mockUserDeviceTokensService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    userSessionRepository = module.get(getRepositoryToken(UserSession));
    userDeviceTokenRepository = module.get(getRepositoryToken(UserDeviceToken));
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'Password123',
        username: 'newuser',
      };

      const hashedPassword = 'hashedPassword123';
      const newUser = { ...mockUser, ...registerDto, password: hashedPassword };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(newUser as User);
      userRepository.save.mockResolvedValue(newUser as User);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: expect.any(String) as unknown as string,
        authMethod: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
      });
      expect(userRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(newUser);
    });

    it('should throw error if email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'Password123',
        username: 'existinguser',
      };

      userRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(service.register(registerDto)).rejects.toThrow(
        new HttpException(
          { messageKey: 'user.EMAIL_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find user by criteria', async () => {
      const where = { id: '123' };
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findOne(where);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const where = { id: '999' };
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(where);
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const createSessionDto: CreateSessionDto = {
        userId: '123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      userSessionRepository.create.mockReturnValue(
        mockUserSession as UserSession,
      );
      userSessionRepository.save.mockResolvedValue(
        mockUserSession as UserSession,
      );

      const result = await service.createSession(createSessionDto);

      expect(userSessionRepository.create).toHaveBeenCalledWith(
        createSessionDto,
      );
      expect(userSessionRepository.save).toHaveBeenCalledWith(mockUserSession);
      expect(result).toEqual(mockUserSession);
    });
  });

  describe('findSessionById', () => {
    it('should find active session by id', async () => {
      const sessionId = 'session123';
      const mockUserSessionsService = module.get(UserSessionsService);
      (mockUserSessionsService.findOne as jest.Mock).mockResolvedValue(
        mockUserSession as UserSession,
      );

      const result = await service.findSessionById(sessionId);

      expect(mockUserSessionsService.findOne).toHaveBeenCalledWith({
        id: sessionId,
        revoked: false,
      });
      expect(result).toEqual(mockUserSession);
    });

    it('should return null if session not found', async () => {
      const sessionId = 'nonexistent';
      const mockUserSessionsService = module.get(UserSessionsService);
      (mockUserSessionsService.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findSessionById(sessionId);

      expect(result).toBeNull();
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const sessionId = 'session123';
      const sessionToRevoke = {
        ...mockUserSession,
        revoked: false,
      } as UserSession;

      userSessionRepository.findOne.mockResolvedValue(sessionToRevoke);
      userSessionRepository.save.mockResolvedValue({
        ...sessionToRevoke,
        revoked: true,
      } as UserSession);

      await service.revokeSession(sessionId);

      expect(userSessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
      expect(userSessionRepository.save).toHaveBeenCalledWith({
        ...sessionToRevoke,
        revoked: true,
      });
    });

    it('should throw error if session not found', async () => {
      const sessionId = 'nonexistent';
      userSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeSession(sessionId)).rejects.toThrow(
        new HttpException(
          { messageKey: 'user.SESSION_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('revokeSessionsByUserId', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = '123';
      userSessionRepository.update.mockResolvedValue({ affected: 2 } as any);

      await service.revokeSessionsByUserId(userId);

      expect(userSessionRepository.update).toHaveBeenCalledWith(
        { userId, revoked: false },
        { revoked: true },
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '123';
      const updateUserDto: UpdateUserDto = { username: 'updateduser' };

      // Mock findById to return a user
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateUser(userId, updateUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: undefined,
        select: undefined,
        withDeleted: false,
      });
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('createDeviceToken', () => {
    it('should create or update device token', async () => {
      const createDeviceTokenDto: CreateDeviceTokenDto = {
        token: 'device-token-123',
        deviceId: 'device123',
        deviceType: 'mobile',
        provider: 'fcm',
      };
      const authPayload = {
        uid: '123',
        ssid: 'session123',
        role: USER_CONSTANTS.ROLES.USER,
      };

      userDeviceTokenRepository.upsert.mockResolvedValue(
        mockUserDeviceToken as any,
      );

      const result = await service.createDeviceToken(
        createDeviceTokenDto,
        authPayload,
      );

      expect(userDeviceTokenRepository.upsert).toHaveBeenCalledWith(
        {
          userId: authPayload.uid,
          sessionId: authPayload.ssid,
          token: createDeviceTokenDto.token,
        },
        {
          conflictPaths: ['token', 'userId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
      expect(result).toEqual(mockUserDeviceToken);
    });
  });

  describe('updateDeviceTokenBySessionId', () => {
    it('should update device token by session id', async () => {
      const sessionId = 'session123';
      const update = { token: 'new-token' };

      userDeviceTokenRepository.update.mockResolvedValue({
        affected: 1,
      } as any);

      const result = await service.updateDeviceTokenBySessionId(
        sessionId,
        update,
      );

      expect(userDeviceTokenRepository.update).toHaveBeenCalledWith(
        { sessionId },
        update,
      );
      expect(result).toEqual({ affected: 1 });
    });
  });
});
