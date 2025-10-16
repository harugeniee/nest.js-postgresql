import * as bcrypt from 'bcrypt';
import { ClientInfo } from 'src/common/decorators';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { AuthPayload } from 'src/common/interface';
import {
  generateOtpCode,
  generateOtpRequestId,
  maskEmail,
} from 'src/common/utils';
import { buildResponse } from 'src/shared/helpers/build-response';
import { CacheService } from 'src/shared/services';
import {
  CreateDeviceTokenDto,
  LoginDto,
  RegisterDto,
  UpdatePasswordDto,
} from 'src/users/dto';
import { User } from 'src/users/entities';
import { UsersService } from 'src/users/users.service';
import { FirebaseLoginDto, OtpRequestDto, OtpVerifyDto } from './dto';
import { OtpData } from './interfaces';

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from 'src/shared/services/firebase/firebase.service';
import { MailerEmailOtpSender, RedisOtpStore } from './providers';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // OTP configuration constants
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL_SECONDS = 5 * 60; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly OTP_PREFIX = 'otp:login:';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly otpStore: RedisOtpStore,
    private readonly emailOtpSender: MailerEmailOtpSender,
    private readonly firebaseService: FirebaseService,
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
      this.configService.get<number>('app.jwt.accessTokenExpiresIn') || '1h';
    const refreshTokenExpiresIn =
      this.configService.get<number>('app.jwt.refreshTokenExpiresIn') || '7d';

    const session = await this.usersService.createSession({
      userId: id,
      metadata: { ...clientInfo, uuid },
      ipAddress: clientInfo.ipAddress || 'unknown',
      userAgent: clientInfo.userAgent || 'unknown',
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    }); // 7 days in seconds

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync<AuthPayload>(
        { uid: id, ssid: session.id, role: user.role },
        {
          expiresIn: accessTokenExpiresIn,
          algorithm: 'HS256',
        },
      ),
      this.jwtService.signAsync<AuthPayload>(
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
        60 * 60, // 1 hour in seconds
      ),
      this.cacheService.set(
        `auth:user:${id}:refreshToken:${session.id}`,
        id,
        60 * 60 * 24 * 7, // 7 days in seconds
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
      this.configService.get<number>('app.jwt.accessTokenExpiresIn') || '1h';
    const session = await this.usersService.findSessionById(authPayload.ssid);

    if (!session || session.isExpired() || !session.isValid()) {
      throw new HttpException(
        { messageKey: 'user.SESSION_EXPIRED' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.usersService.findById(session.userId);
    const accessToken = await this.jwtService.signAsync<AuthPayload>(
      { uid: session.userId, ssid: session.id, role: user.role },
      {
        expiresIn: accessTokenExpiresIn,
        algorithm: 'HS256',
      },
    );
    await this.cacheService.set(
      `auth:user:${session.userId}:accessToken:${session.id}`,
      accessToken,
      60 * 60, // 1 hour in seconds
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

  async getSessions(paginationDto: AdvancedPaginationDto) {
    return await this.usersService.findSessionsByUserId(paginationDto);
  }

  async getSessionsCursor(paginationDto: CursorPaginationDto) {
    return await this.usersService.findSessionsByUserIdCursor(paginationDto);
  }

  async getSessionById(id: string) {
    return await this.usersService.findSessionById(id);
  }

  /**
   * Request OTP for login
   * @param otpRequestDto - OTP request data
   * @returns OTP request result
   */
  async requestOtp(otpRequestDto: OtpRequestDto) {
    const maskedEmail = maskEmail(otpRequestDto.email);

    try {
      this.logger.log(`OTP request initiated for email: ${maskedEmail}`);

      // Check if user exists (for security, we don't reveal if user exists or not)
      const user = await this.usersService.findByEmail(otpRequestDto.email);

      // Always return success message regardless of user existence for security
      const requestId = generateOtpRequestId();
      const otpCode = generateOtpCode(this.OTP_LENGTH);
      const now = Date.now();
      const expiresAt = now + this.OTP_TTL_SECONDS * 1000;

      // Only proceed with OTP generation and email sending if user exists
      if (user) {
        const otpData: OtpData = {
          code: otpCode,
          email: otpRequestDto.email.toLowerCase(),
          createdAt: now,
          expiresAt,
          attempts: 0,
          maxAttempts: this.MAX_ATTEMPTS,
          isUsed: false,
          requestId,
        };

        // Store OTP in cache
        const storeKey = this.getOtpStoreKey(otpRequestDto.email);
        await this.otpStore.set(storeKey, otpData, this.OTP_TTL_SECONDS);

        // Send OTP via email
        await this.emailOtpSender.sendOtp(
          otpRequestDto.email,
          otpCode,
          requestId,
        );

        this.logger.log(
          `OTP sent successfully to: ${maskedEmail}, requestId: ${requestId}`,
        );
      } else {
        this.logger.log(
          `OTP request for non-existent user: ${maskedEmail}, requestId: ${requestId}`,
        );
      }

      return buildResponse({
        messageKey: 'auth.OTP_SENT_SUCCESS',
        data: {
          requestId,
          expiresInSec: this.OTP_TTL_SECONDS,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to request OTP for email ${maskedEmail}:`,
        error,
      );
      throw new HttpException(
        {
          messageKey: 'auth.OTP_REQUEST_FAILED',
          details: 'Failed to process OTP request. Please try again later.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify OTP and login user
   * @param otpVerifyDto - OTP verification data
   * @param clientInfo - Client information
   * @returns Login result with JWT tokens
   */
  async verifyOtp(otpVerifyDto: OtpVerifyDto, clientInfo: ClientInfo) {
    const maskedEmail = maskEmail(otpVerifyDto.email);

    try {
      this.logger.log(
        `OTP verification initiated for email: ${maskedEmail}, requestId: ${otpVerifyDto.requestId || 'N/A'}`,
      );

      const storeKey = this.getOtpStoreKey(otpVerifyDto.email);
      const otpData = await this.otpStore.get(storeKey);

      if (!otpData) {
        this.logger.warn(`OTP not found for email: ${maskedEmail}`);
        throw new HttpException(
          {
            messageKey: 'auth.OTP_NOT_FOUND',
            details: 'OTP code not found. Please request a new one.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if OTP is already used
      if (otpData.isUsed) {
        this.logger.warn(`OTP already used for email: ${maskedEmail}`);
        throw new HttpException(
          {
            messageKey: 'auth.OTP_ALREADY_USED',
            details:
              'OTP code has already been used. Please request a new one.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check if OTP is expired
      if (Date.now() > otpData.expiresAt) {
        this.logger.warn(`OTP expired for email: ${maskedEmail}`);
        await this.otpStore.delete(storeKey);
        throw new HttpException(
          {
            messageKey: 'auth.OTP_EXPIRED',
            details: 'OTP code has expired. Please request a new one.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Check if max attempts exceeded
      if (otpData.attempts >= otpData.maxAttempts) {
        this.logger.warn(`Max attempts exceeded for email: ${maskedEmail}`);
        await this.otpStore.delete(storeKey);
        throw new HttpException(
          {
            messageKey: 'auth.OTP_MAX_ATTEMPTS_EXCEEDED',
            details:
              'Maximum verification attempts exceeded. Please request a new OTP.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Verify OTP code
      if (otpData.code !== otpVerifyDto.code) {
        this.logger.warn(
          `Invalid OTP code for email: ${maskedEmail}, attempts: ${otpData.attempts + 1}`,
        );

        // Increment attempts
        const updatedOtpData = await this.otpStore.incrementAttempts(storeKey);

        if (!updatedOtpData) {
          throw new HttpException(
            {
              messageKey: 'auth.OTP_UPDATE_FAILED',
              details:
                'Failed to update OTP attempts. Please request a new one.',
            },
            HttpStatus.UNAUTHORIZED,
          );
        }

        const remainingAttempts =
          updatedOtpData.maxAttempts - updatedOtpData.attempts;
        const expiresInSec = Math.max(
          0,
          Math.floor((updatedOtpData.expiresAt - Date.now()) / 1000),
        );

        if (remainingAttempts <= 0) {
          await this.otpStore.delete(storeKey);
          throw new HttpException(
            {
              messageKey: 'auth.OTP_MAX_ATTEMPTS_EXCEEDED',
              details:
                'Maximum verification attempts exceeded. Please request a new OTP.',
            },
            HttpStatus.UNAUTHORIZED,
          );
        }

        throw new HttpException(
          {
            messageKey: 'auth.OTP_INVALID_CODE',
            details: 'Invalid OTP code. Please check and try again.',
            remainingAttempts,
            expiresInSec,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // OTP is valid - mark as used and delete
      await this.otpStore.markAsUsed(storeKey);

      this.logger.log(`OTP verified successfully for email: ${maskedEmail}`);

      // Get user for login
      const user = await this.usersService.findByEmail(otpVerifyDto.email);
      if (!user) {
        throw new HttpException(
          { messageKey: 'user.USER_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Generate JWT tokens (reuse existing logic)
      const token = await this.generateToken(user, clientInfo);

      return buildResponse({
        messageKey: 'auth.OTP_LOGIN_SUCCESS',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to verify OTP for email ${maskedEmail}:`,
        error,
      );
      throw new HttpException(
        {
          messageKey: 'auth.OTP_VERIFICATION_ERROR',
          details: 'OTP verification failed. Please try again later.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get store key for OTP data
   * @param email - User email address
   * @returns Store key for OTP data
   */
  private getOtpStoreKey(email: string): string {
    return `${this.OTP_PREFIX}${email.toLowerCase()}`;
  }

  /**
   * Firebase authentication login
   * @param firebaseLoginDto - Firebase login data containing ID token
   * @param clientInfo - Client information
   * @returns Login result with JWT tokens
   */
  async firebaseLogin(
    firebaseLoginDto: FirebaseLoginDto,
    clientInfo: ClientInfo,
  ) {
    try {
      this.logger.log('Firebase authentication initiated');

      // Step 1: Verify Firebase ID token with Firebase
      const firebaseResult = await this.firebaseService.authenticate(
        firebaseLoginDto.idToken,
      );

      if (!firebaseResult.success || !firebaseResult.user) {
        this.logger.warn('Firebase authentication failed');
        throw new HttpException(
          {
            messageKey: 'auth.FIREBASE_AUTH_FAILED',
            details: firebaseResult.error || 'Firebase authentication failed',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const firebaseUser = firebaseResult.user;
      console.log(JSON.stringify(firebaseUser, null, 2));
      this.logger.log(
        `Firebase user authenticated: ${firebaseUser.uid}, email: ${firebaseUser.email}`,
      );

      // Step 2: Check if user exists in database by Firebase UID
      let user = await this.usersService.findByFirebaseUid(firebaseUser.uid);

      if (!user) {
        // Step 3: If user doesn't exist, create new user
        this.logger.log(
          `Creating new user for Firebase UID: ${firebaseUser.uid}`,
        );

        user = await this.usersService.createFromFirebase({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser?.email || '',
          name:
            (firebaseUser?.name as string) ||
            firebaseUser?.email?.split('@')[0] ||
            firebaseUser?.uid ||
            'Unknown User',
          emailVerified: firebaseUser.email_verified || false,
          photoUrl: firebaseUser.picture,
          oauthId: firebaseUser.uid,
          oauthProvider: firebaseUser.firebase.sign_in_provider,
        });
      } else {
        // Step 4: Update existing user with latest Firebase data
        this.logger.log(
          `Updating existing user with Firebase data: ${firebaseUser.uid}`,
        );
        await this.usersService.updateUser(user.id, {
          isEmailVerified: firebaseUser.email_verified || false,
          photoUrl: firebaseUser.picture,
          // oauthId: firebaseUser.uid,
          // oauthProvider: firebaseUser.firebase.sign_in_provider,
        });
      }

      // Step 5: Generate JWT tokens (same as email/password login)
      const token = await this.generateToken(user, clientInfo);

      this.logger.log(`Firebase login successful for user: ${user.id}`);

      return buildResponse({
        messageKey: 'auth.FIREBASE_LOGIN_SUCCESS',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Firebase login failed:', error);
      throw new HttpException(
        {
          messageKey: 'auth.FIREBASE_LOGIN_ERROR',
          details: 'Firebase authentication failed. Please try again later.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
