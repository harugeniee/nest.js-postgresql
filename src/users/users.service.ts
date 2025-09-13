import * as bcrypt from 'bcrypt';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import {
  AuthPayload,
  IPagination,
  IPaginationCursor,
} from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { USER_CONSTANTS } from 'src/shared/constants';
import { CacheService } from 'src/shared/services';
import {
  CreateDeviceTokenDto,
  CreateSessionDto,
  RegisterDto,
  UpdateUserDto,
} from 'src/users/dto';
import { User, UserDeviceToken, UserSession } from 'src/users/entities';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDeviceTokensService, UserSessionsService } from './services';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,

    @InjectRepository(UserDeviceToken)
    private readonly userDeviceTokenRepository: Repository<UserDeviceToken>,

    private readonly userSessionService: UserSessionsService,
    private readonly userDeviceTokenService: UserDeviceTokensService,

    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<User>(userRepository),
      {
        entityName: 'User',
        cache: { enabled: true, ttlSec: 60, prefix: 'users', swrSec: 30 },
        defaultSearchField: 'name',
        relationsWhitelist: {
          avatar: true,
        },
      },
      cacheService,
    );
  }

  protected getSearchableColumns(): (keyof User)[] {
    return ['name', 'email', 'username'];
  }

  async register(userRegister: RegisterDto) {
    try {
      const user = await this.findByEmail(userRegister.email);
      if (user) {
        throw new HttpException(
          { messageKey: 'user.EMAIL_ALREADY_EXISTS' },
          HttpStatus.BAD_REQUEST,
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const hashedPassword = await bcrypt.hash(userRegister.password, 10);

      const newUser = this.userRepository.create({
        ...userRegister,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: hashedPassword,
        authMethod: USER_CONSTANTS.AUTH_METHODS.EMAIL_PASSWORD,
      });

      return await this.userRepository.save(newUser);
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

  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findByFirebaseUid(firebaseUid: string) {
    return await this.userRepository.findOne({ where: { firebaseUid } });
  }

  async createFromFirebase(firebaseData: {
    firebaseUid: string;
    email: string;
    name: string;
    emailVerified: boolean;
    photoUrl?: string;
  }) {
    // Generate a unique username from email
    const username = firebaseData.email.split('@')[0] + '_' + Date.now();

    const userData = {
      name: firebaseData.name,
      username,
      email: firebaseData.email,
      firebaseUid: firebaseData.firebaseUid,
      photoUrl: firebaseData.photoUrl,
      isEmailVerified: firebaseData.emailVerified,
      authMethod: USER_CONSTANTS.AUTH_METHODS.FIREBASE,
      status: USER_CONSTANTS.STATUS.ACTIVE,
      role: USER_CONSTANTS.ROLES.USER,
    };

    // Use the inherited create method from BaseService
    return await this.create(userData);
  }

  // Inherit BaseService.findOne
  // Inherit BaseService.findById

  async createSession(
    createSessionDto: CreateSessionDto,
  ): Promise<UserSession> {
    const session = this.userSessionRepository.create({
      ...createSessionDto,
    });
    return await this.userSessionRepository.save(session);
  }

  async revokeSession(id: string): Promise<void> {
    const session = await this.userSessionRepository.findOne({ where: { id } });
    if (!session) {
      throw new HttpException(
        { messageKey: 'user.SESSION_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }
    session.revoked = true;
    await this.userSessionRepository.save(session);
  }

  async revokeSessionsByUserId(userId: string): Promise<void> {
    await this.userSessionRepository.update(
      { userId: userId, revoked: false },
      { revoked: true },
    );
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new HttpException(
        { messageKey: 'user.USER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }
    Object.assign(user, updateUserDto);
    return await this.userRepository.update(id, updateUserDto);
  }

  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<User>> {
    return this.listOffset(paginationDto);
  }

  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<User>> {
    return this.listCursor(paginationDto);
  }

  async createDeviceToken(
    createDeviceTokenDto: CreateDeviceTokenDto,
    authPayload: AuthPayload,
  ) {
    const deviceToken = await this.userDeviceTokenRepository.upsert(
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
    return deviceToken;
  }

  async updateDeviceTokenBySessionId(
    sessionId: string,
    update: QueryDeepPartialEntity<UserDeviceToken>,
  ) {
    return await this.userDeviceTokenRepository.update({ sessionId }, update);
  }

  async findSessionsByUserId(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<UserSession>> {
    return await this.userSessionService.listOffset(paginationDto);
  }

  async findSessionsByUserIdCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<UserSession>> {
    return await this.userSessionService.listCursor(paginationDto);
  }

  async findSessionById(id: string): Promise<UserSession | null> {
    return await this.userSessionService.findOne({ id, revoked: false });
  }

  async hasPermission(
    userId: string,
    authPayload: AuthPayload,
  ): Promise<boolean> {
    if (authPayload.role === USER_CONSTANTS.ROLES.ADMIN) {
      return true;
    }
    if (userId !== authPayload.uid) {
      throw new ForbiddenException({
        messageKey: 'auth.FORBIDDEN',
      });
    }
    return true;
  }
}
