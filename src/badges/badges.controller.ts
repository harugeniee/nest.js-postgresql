import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AuthPayload } from 'src/common/interface/auth.interface';
import { SnowflakeIdPipe } from 'src/common/pipes/snowflake-id.pipe';
import { BadgeEntityType } from 'src/shared/constants';
import { BadgesService } from './badges.service';
import { AssignBadgeDto } from './dto/assign-badge.dto';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GetBadgeAssignmentDto } from './dto/get-badge-assignment.dto';
import { GetBadgeDto } from './dto/get-badge.dto';
import { RevokeBadgeDto } from './dto/revoke-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeAssignment } from './entities/badge-assignment.entity';
import { Badge } from './entities/badge.entity';

/**
 * Badge controller for managing badges and badge assignments
 * Provides CRUD operations for badges and badge assignment management
 */
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * Create a new badge
   */
  @Post()
  @Auth(['admin'])
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBadgeDto: CreateBadgeDto): Promise<Badge> {
    return this.badgesService.createBadge(createBadgeDto);
  }

  /**
   * Get all badges with optional filters
   */
  @Get()
  async findAll(
    @Query() query: GetBadgeDto,
  ): Promise<{ result: Badge[]; metaData: any }> {
    return this.badgesService.listOffset(query);
  }

  /**
   * Get badge by ID
   */
  @Get(':id')
  async findOne(@Param('id', SnowflakeIdPipe) id: string): Promise<Badge> {
    return this.badgesService.findById(id);
  }

  /**
   * Get badge by type
   */
  @Get('type/:type')
  async findByType(@Param('type') type: string): Promise<Badge | null> {
    return this.badgesService.getBadgeByType(type);
  }

  /**
   * Get badges by category
   */
  @Get('category/:category')
  async findByCategory(@Param('category') category: string): Promise<Badge[]> {
    return this.badgesService.getBadgesByCategory(category);
  }

  /**
   * Get badges by rarity
   */
  @Get('rarity/:rarity')
  async findByRarity(@Param('rarity') rarity: string): Promise<Badge[]> {
    return this.badgesService.getBadgesByRarity(rarity);
  }

  /**
   * Get visible badges only
   */
  @Get('visible/all')
  async findVisible(): Promise<Badge[]> {
    return this.badgesService.getVisibleBadges();
  }

  /**
   * Get obtainable badges only
   */
  @Get('obtainable/all')
  async findObtainable(): Promise<Badge[]> {
    return this.badgesService.getObtainableBadges();
  }

  /**
   * Update badge
   */
  @Patch(':id')
  @Auth(['admin'])
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateBadgeDto: UpdateBadgeDto,
  ): Promise<Badge> {
    return this.badgesService.updateBadge(id, updateBadgeDto);
  }

  /**
   * Delete badge
   */
  @Delete(':id')
  @Auth(['admin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', SnowflakeIdPipe) id: string): Promise<void> {
    return this.badgesService.remove(id);
  }

  /**
   * Assign badge to entity
   */
  @Post('assign')
  @Auth(['admin', 'moderator'])
  @HttpCode(HttpStatus.CREATED)
  async assignBadge(
    @Body() assignBadgeDto: AssignBadgeDto,
    @Request() req: Request & { user: AuthPayload },
  ): Promise<BadgeAssignment> {
    return this.badgesService.assignBadge(assignBadgeDto, req.user.uid);
  }

  /**
   * Revoke badge assignment
   */
  @Patch('assign/:assignmentId/revoke')
  @Auth(['admin', 'moderator'])
  async revokeBadge(
    @Param('assignmentId', SnowflakeIdPipe) assignmentId: string,
    @Body() revokeBadgeDto: RevokeBadgeDto,
    @Request() req: Request & { user: AuthPayload },
  ): Promise<BadgeAssignment> {
    return this.badgesService.revokeBadge(
      assignmentId,
      revokeBadgeDto,
      req.user.uid,
    );
  }

  /**
   * Get badge assignments with filters
   */
  @Get('assignments')
  @Auth(['admin', 'moderator'])
  async getBadgeAssignments(@Query() query: GetBadgeAssignmentDto): Promise<{
    result: BadgeAssignment[];
    metaData: any;
  }> {
    return this.badgesService.getBadgeAssignments(query);
  }

  /**
   * Get badges assigned to a specific entity
   */
  @Get('entity/:entityType/:entityId')
  async getEntityBadges(
    @Param('entityType') entityType: BadgeEntityType,
    @Param('entityId', SnowflakeIdPipe) entityId: string,
  ): Promise<BadgeAssignment[]> {
    return this.badgesService.getEntityBadges(entityType, entityId);
  }

  /**
   * Get badge assignment by ID
   */
  @Get('assignments/:assignmentId')
  @Auth(['admin', 'moderator'])
  async getBadgeAssignment(
    @Param('assignmentId', SnowflakeIdPipe) assignmentId: string,
  ): Promise<BadgeAssignment | null> {
    return this.badgesService.getBadgeAssignment(assignmentId);
  }

  /**
   * Check if an entity has a specific badge
   */
  @Get('entity/:entityType/:entityId/has/:badgeType')
  async hasBadge(
    @Param('entityType') entityType: BadgeEntityType,
    @Param('entityId', SnowflakeIdPipe) entityId: string,
    @Param('badgeType') badgeType: string,
  ): Promise<boolean> {
    return this.badgesService.hasBadge(entityType, entityId, badgeType);
  }

  /**
   * Get badge statistics
   */
  @Get('stats/overview')
  @Auth(['admin'])
  async getBadgeStatistics(): Promise<{
    totalBadges: number;
    activeBadges: number;
    totalAssignments: number;
    badgesByCategory: Record<string, number>;
    badgesByRarity: Record<string, number>;
  }> {
    return this.badgesService.getBadgeStatistics();
  }

  /**
   * Clean up expired badge assignments
   */
  @Post('cleanup/expired')
  @Auth(['admin'])
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredAssignments(): Promise<{ cleanedCount: number }> {
    const cleanedCount = await this.badgesService.cleanupExpiredAssignments();
    return { cleanedCount };
  }
}
