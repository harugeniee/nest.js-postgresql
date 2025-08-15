import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';
import { Auth } from 'src/common/decorators';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { USER_CONSTANTS } from 'src/shared/constants';
import { RegisterDto } from 'src/users/dto/register.dto';
import { UsersService } from 'src/users/users.service';

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

  @Get()
  @Auth(USER_CONSTANTS.ROLES.ADMIN)
  async getUsers(@Query() paginationDto: AdvancedPaginationDto) {
    return await this.usersService.findAll(paginationDto);
  }

  @Get('cursor')
  @Auth(USER_CONSTANTS.ROLES.ADMIN)
  async getUsersCursor(@Query() paginationDto: CursorPaginationDto) {
    return await this.usersService.findAllCursor(paginationDto);
  }

  @Get(':id')
  @UseGuards(JwtAccessTokenGuard)
  async getUserById(@Param('id', new SnowflakeIdPipe()) id: string) {
    return await this.usersService.findOne({ id });
  }
}
