import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { UserDeviceToken } from 'src/users/entities';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/common/services';

@Injectable()
export class UserDeviceTokensService extends BaseService<UserDeviceToken> {
  constructor(
    @InjectRepository(UserDeviceToken)
    private readonly userDeviceTokenRepository: Repository<UserDeviceToken>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<UserDeviceToken>(userDeviceTokenRepository),
      {
        entityName: 'UserDeviceToken',
        cache: { enabled: true, ttlSec: 60, prefix: 'user-device-tokens' },
        defaultSearchField: 'token',
      },
      cacheService,
    );
  }
}
