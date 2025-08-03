import { ClientInfo } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { LoginDto, RegisterDto } from 'src/users/dto';
import { UpdatePasswordDto } from 'src/users/dto/update-password.dto';

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

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
}
