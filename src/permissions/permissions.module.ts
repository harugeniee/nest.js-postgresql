import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from 'src/shared/services';
import { ChannelOverwrite } from './entities/channel-overwrite.entity';
import { Role } from './entities/role.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

/**
 * Permissions module providing Discord-style permission system
 * Handles roles, user-role assignments, channel overwrites, and permission calculations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      UserRole,
      ChannelOverwrite,
      UserPermission,
    ]),
    CacheModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
