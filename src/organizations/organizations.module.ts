import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { Organization, UserOrganization } from './entities';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

/**
 * Organizations Module
 *
 * Module for organization management functionality
 * Handles organization CRUD operations, membership management, and organization-specific features
 * Integrates with permissions system for role-based access control
 */
@Module({
  imports: [
    // Register entities with TypeORM
    TypeOrmModule.forFeature([Organization, UserOrganization]),
    // Import permissions module for role-based access control
    PermissionsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
