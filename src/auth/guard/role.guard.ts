import { AuthPayload } from 'src/common/interface';
import { UserRole } from 'src/shared/constants';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../../common/decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthPayload }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'auth.UNAUTHORIZED',
      });
    }

    const hasRole = requiredRoles.some(role => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException({
        messageKey: 'auth.FORBIDDEN',
      });
    }
    return hasRole;
  }
}
