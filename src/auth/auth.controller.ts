import { Auth, ClientInfo } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { CreateDeviceTokenDto, LoginDto, RegisterDto } from 'src/users/dto';
import { UpdatePasswordDto } from 'src/users/dto/update-password.dto';
import { FirebaseLoginDto, OtpRequestDto, OtpVerifyDto } from './dto';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { CustomRateLimit } from 'src/rate-limit/rate-limit.decorator';
import { AuthService } from './auth.service';
import { JwtAccessTokenGuard } from './guard/jwt-access-token.guard';
import { JwtRefreshTokenGuard } from './guard/jwt-refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @ClientInfo() clientInfo: ClientInfo,
  ) {
    return this.authService.register(registerDto, clientInfo);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @ClientInfo() clientInfo: ClientInfo,
  ) {
    return this.authService.login(loginDto, clientInfo);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshTokenGuard)
  async refreshToken(@Request() req: Request & { user: AuthPayload }) {
    const authPayload = req.user;
    return this.authService.refreshToken(authPayload);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessTokenGuard)
  async logout(@Request() req: Request & { user: AuthPayload }) {
    const authPayload = req.user;
    return this.authService.logout(authPayload);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessTokenGuard)
  async logoutAll(@Request() req: Request & { user: AuthPayload }) {
    const authPayload = req.user;
    return this.authService.logoutAll(authPayload);
  }

  @Put('update-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessTokenGuard)
  async updatePassword(
    @Request() req: Request & { user: AuthPayload },
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const authPayload = req.user;
    return this.authService.updatePassword(authPayload, updatePasswordDto);
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAccessTokenGuard)
  async createDeviceToken(
    @Request() req: Request & { user: AuthPayload },
    @Body() createDeviceTokenDto: CreateDeviceTokenDto,
  ) {
    const authPayload = req.user;
    return this.authService.createDeviceToken(
      createDeviceTokenDto,
      authPayload,
    );
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @Auth()
  async getSessions(
    @Request() req: Request & { user: AuthPayload },
    @Query() paginationDto: AdvancedPaginationDto,
  ) {
    Object.assign(paginationDto, { userId: req.user.uid });
    return this.authService.getSessions(paginationDto);
  }

  @Get('sessions-cursor')
  @HttpCode(HttpStatus.OK)
  @Auth()
  async getSessionsCursor(
    @Request() req: Request & { user: AuthPayload },
    @Query() paginationDto: CursorPaginationDto,
  ) {
    Object.assign(paginationDto, { userId: req.user.uid });
    return this.authService.getSessionsCursor(paginationDto);
  }

  @Get('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @Auth()
  async getSessionById(@Param('id') id: string) {
    return this.authService.getSessionById(id);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @CustomRateLimit(3, 15 * 60)
  async requestOtp(@Body() otpRequestDto: OtpRequestDto) {
    return this.authService.requestOtp(otpRequestDto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() otpVerifyDto: OtpVerifyDto,
    @ClientInfo() clientInfo: ClientInfo,
  ) {
    return this.authService.verifyOtp(otpVerifyDto, clientInfo);
  }

  @Post('firebase/login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(
    @Body() firebaseLoginDto: FirebaseLoginDto,
    @ClientInfo() clientInfo: ClientInfo,
  ) {
    return this.authService.firebaseLogin(firebaseLoginDto, clientInfo);
  }
}
