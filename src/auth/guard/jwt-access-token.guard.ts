import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayload } from 'src/common/interface';
import { AuthGuard } from './auth.guard';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard {
  protected async verifyCache(payload: AuthPayload): Promise<void> {
    const cacheKey = `auth:user:${payload.uid}:accessToken:${payload.ssid}`;
    const ttl = await this.cacheService.getTtl(cacheKey);
    if (!ttl || ttl <= 0) {
      throw new UnauthorizedException({
        messageKey: 'auth.INVALID_TOKEN',
      });
    }
  }

  protected async afterVerify(payload: AuthPayload): Promise<void> {
    await this.verifyCache(payload);
  }
}
