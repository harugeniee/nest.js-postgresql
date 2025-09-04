import { UserDeviceToken, UserSession, User } from 'src/users/entities';
import {
  UserDeviceTokensService,
  UserSessionsService,
} from 'src/users/services';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSession, UserDeviceToken])],
  controllers: [UsersController],
  providers: [UsersService, UserSessionsService, UserDeviceTokensService],
  exports: [UsersService, UserSessionsService, UserDeviceTokensService],
})
export class UsersModule {}
