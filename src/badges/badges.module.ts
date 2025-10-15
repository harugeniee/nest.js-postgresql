import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from 'src/shared/services/cache/cache.service';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeAssignment } from './entities/badge-assignment.entity';
import { Badge } from './entities/badge.entity';
import { BadgeAssignmentService } from './services/badge-assignment.service';
import { BadgeAutomationService } from './services/badge-automation.service';

/**
 * Badge module for managing badges and badge assignments
 * Provides a comprehensive badge system similar to Discord's badge system
 *
 * Features:
 * - Badge CRUD operations
 * - Polymorphic badge assignments to any entity type
 * - Badge statistics and analytics
 * - Automatic cleanup of expired assignments
 * - Caching for performance
 * - Role-based access control
 * - Automated badge assignment based on user activity
 * - Badge assignment management and analytics
 */
@Module({
  imports: [TypeOrmModule.forFeature([Badge, BadgeAssignment])],
  controllers: [BadgesController],
  providers: [
    BadgesService,
    BadgeAssignmentService,
    BadgeAutomationService,
    CacheService,
  ],
  exports: [BadgesService, BadgeAssignmentService, BadgeAutomationService],
})
export class BadgesModule {}
