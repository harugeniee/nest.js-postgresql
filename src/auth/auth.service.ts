import * as bcrypt from 'bcrypt';
import { ClientInfo } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { buildResponse } from 'src/shared/helpers/build-response';
import { CacheService } from 'src/shared/services';
import { CreateDeviceTokenDto, LoginDto, RegisterDto } from 'src/users/dto';
import { UpdatePasswordDto } from 'src/users/dto/update-password.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async register(registerDto: RegisterDto, clientInfo: ClientInfo) {
    const user = await this.usersService.register(registerDto);
    const token = await this.generateToken(user, clientInfo);
    return buildResponse({
      messageKey: 'user.REGISTER_SUCCESS',
      data: {
        user,
        token,
      },
    });
  }

  async login(loginDto: LoginDto, clientInfo: ClientInfo) {
    const user = await this.usersService.findOne({
      email: loginDto.email,
    });
    if (!user) {
      throw new HttpException(
        { messageKey: 'user.USER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpException(
        { messageKey: 'user.INVALID_PASSWORD' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return buildResponse({
      messageKey: 'user.LOGIN_SUCCESS',
      data: {
        user,
        token: await this.generateToken(user, clientInfo),
      },
    });
  }

  async generateToken(
    user: User,
    clientInfo: ClientInfo,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { id, uuid } = user;
    const accessTokenExpiresIn =
      this.configService.get<string>('app.jwt.accessTokenExpiresIn') || '1h';
    const refreshTokenExpiresIn =
      this.configService.get<string>('app.jwt.refreshTokenExpiresIn') || '7d';

    const session = await this.usersService.createSession({
      userId: id,
      metadata: { ...clientInfo, uuid },
      ipAddress: clientInfo.ipAddress || 'unknown',
      userAgent: clientInfo.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7),
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.sign(
        { uid: id, ssid: session.id, role: user.role },
        {
          expiresIn: accessTokenExpiresIn,
          algorithm: 'HS256',
        },
      ),
      this.jwtService.sign(
        { uid: id, ssid: session.id },
        {
          expiresIn: refreshTokenExpiresIn,
          algorithm: 'HS512',
        },
      ),
    ]);
    await Promise.all([
      this.cacheService.set(
        `auth:user:${id}:accessToken:${session.id}`,
        id,
        60 * 60,
      ),
      this.cacheService.set(
        `auth:user:${id}:refreshToken:${session.id}`,
        id,
        60 * 60 * 24 * 7,
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async logout(authPayload: AuthPayload) {
    await Promise.all([
      this.usersService.revokeSession(authPayload.ssid),
      this.cacheService.deleteKeysBySuffix(`*${authPayload.ssid}`),
    ]);
    return buildResponse({
      messageKey: 'user.LOGOUT_SUCCESS',
    });
  }

  async logoutAll(authPayload: AuthPayload) {
    await Promise.all([
      this.usersService.revokeSessionsByUserId(authPayload.uid),
      this.cacheService.deleteKeysBySuffix(`auth:user:${authPayload.uid}:*`),
    ]);
    return buildResponse({
      messageKey: 'user.LOGOUT_ALL_DEVICES_SUCCESS',
    });
  }

  async updatePassword(
    authPayload: AuthPayload,
    updatePasswordDto: UpdatePasswordDto,
  ) {
    const user = await this.usersService.findById(authPayload.uid);
    if (!user) {
      throw new HttpException(
        { messageKey: 'user.USER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpException(
        { messageKey: 'user.INVALID_PASSWORD' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.usersService.updateUser(authPayload.uid, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      password: hashedPassword,
    });
    return buildResponse({
      messageKey: 'user.PASSWORD_UPDATED_SUCCESS',
    });
  }

  async refreshToken(authPayload: AuthPayload) {
    const accessTokenExpiresIn =
      this.configService.get<string>('app.jwt.accessTokenExpiresIn') || '1h';
    const session = await this.usersService.findSessionById(authPayload.ssid);

    if (!session || session.isExpired() || !session.isValid()) {
      throw new HttpException(
        { messageKey: 'user.SESSION_EXPIRED' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.usersService.findById(session.userId);
    const accessToken = await this.jwtService.signAsync(
      { uid: session.userId, ssid: session.id, role: user.role },
      {
        expiresIn: accessTokenExpiresIn,
        algorithm: 'HS256',
      },
    );
    await this.cacheService.set(
      `auth:user:${session.userId}:accessToken:${session.id}`,
      accessToken,
      60 * 60,
    );
    return buildResponse({
      data: {
        accessToken,
      },
      messageKey: 'user.ACCESS_TOKEN_REFRESHED_SUCCESS',
    });
  }

  async createDeviceToken(
    createDeviceTokenDto: CreateDeviceTokenDto,
    authPayload: AuthPayload,
  ) {
    return await this.usersService.createDeviceToken(
      createDeviceTokenDto,
      authPayload,
    );
  }
}
