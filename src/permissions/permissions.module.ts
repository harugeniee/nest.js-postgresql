import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from 'src/shared/services';
import { Role } from './entities/role.entity';
import { ScopePermission } from './entities/scope-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import {
  ArticleContextResolver,
  OrganizationContextResolver,
  SegmentContextResolver,
} from './resolvers';
import { UserPermissionService } from './services';
import { ContextResolverService } from './services/context-resolver.service';
import { PermissionEvaluator } from './services/permission-evaluator.service';
import { PermissionRegistry } from './services/permission-registry.service';
import { RoleService } from './services/role.service';
import { ScopePermissionService } from './services/scope-permission.service';
import { UserRoleService } from './services/user-role.service';

/**
 * Permissions module providing Discord-style permission system
 * Handles roles, user-role assignments, and permission calculations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, UserPermission, ScopePermission]),
    CacheModule,
  ],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    RoleService,
    UserRoleService,
    UserPermissionService,
    ContextResolverService,
    SegmentContextResolver,
    OrganizationContextResolver,
    ArticleContextResolver,
    PermissionRegistry,
    PermissionEvaluator,
    ScopePermissionService,
  ],
  exports: [
    PermissionsService,
    RoleService,
    UserRoleService,
    UserPermissionService,
    ContextResolverService,
    PermissionRegistry,
    PermissionEvaluator,
    ScopePermissionService,
  ],
})
export class PermissionsModule {}
