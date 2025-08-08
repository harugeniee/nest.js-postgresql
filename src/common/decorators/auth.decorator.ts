import { JwtAccessTokenGuard, RolesGuard } from 'src/auth/guard';
import { UserRole } from 'src/shared/constants';

import { applyDecorators, UseGuards } from '@nestjs/common';

import { Roles } from './roles.decorator';

export function Auth(roles?: UserRole | UserRole[]) {
  if (!roles) return applyDecorators(UseGuards(JwtAccessTokenGuard));
  return applyDecorators(
    Roles(...(Array.isArray(roles) ? roles : [roles])),
    UseGuards(JwtAccessTokenGuard, RolesGuard),
  );
}
