import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { UserSession } from 'src/users/entities';
import { CacheService } from 'src/shared/services';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/common/services';

@Injectable()
export class UserSessionsService extends BaseService<UserSession> {
  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<UserSession>(userSessionRepository),
      {
        entityName: 'UserSession',
        cache: { enabled: true, ttlSec: 60, prefix: 'user-sessions' },
        defaultSearchField: 'userAgent',
      },
      cacheService,
    );
  }
}
