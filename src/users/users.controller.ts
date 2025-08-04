import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { RegisterDto } from './dto/register.dto';
import { UsersService } from './users.service';
import { AdvancedPaginationDto } from 'src/common/dto';
import { USER_CONSTANTS } from 'src/shared/constants';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  @Get(['@me', 'me'])
  @Auth()
  async getMe(@Request() req: Request & { user: AuthPayload }) {
    return await this.usersService.findOne({ id: req.user.uid });
  }

  @Get(':id')
  @UseGuards(JwtAccessTokenGuard)
  async getUserById(@Param('id') id: string) {
    return await this.usersService.findOne({ id });
  }

  @Get()
  @Auth(USER_CONSTANTS.ROLES.ADMIN)
  async getUsers(@Query() paginationDto: AdvancedPaginationDto) {
    return await this.usersService.findAll(paginationDto);
  }
}
