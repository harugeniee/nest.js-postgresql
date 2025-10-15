import { applyDecorators, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/auth/guard/permissions.guard';
import { PermissionCheckOptions, Permissions } from './permissions.decorator';

export function RequirePermissions(options: PermissionCheckOptions) {
  return applyDecorators(Permissions(options), UseGuards(PermissionsGuard));
}
