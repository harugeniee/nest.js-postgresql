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
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';
import { Auth, RequirePermissions } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import {
  CreateOrganizationDto,
  GetOrganizationDto,
  UpdateOrganizationDto,
} from './dto';
import { Organization } from './entities/organization.entity';
import { OrganizationsService } from './organizations.service';

/**
 * Organizations Controller
 *
 * REST API controller for organization management
 * Handles CRUD operations for organizations with proper authentication and authorization
 */
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Create a new organization
   * Only authenticated users can create organizations
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ORGANIZATION_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SOCIAL,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ORGANIZATION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Req() req: Request & { user: AuthPayload },
  ): Promise<Organization> {
    // Override owner ID with authenticated user's ID
    createOrganizationDto.ownerId = req.user.uid;

    return this.organizationsService.createOrganization(createOrganizationDto);
  }

  /**
   * Get all organizations with filtering and pagination
   * Public endpoint - anyone can view public organizations
   */
  @Get()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ORGANIZATION_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SOCIAL,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ORGANIZATION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findAll(@Query() query: GetOrganizationDto) {
    return this.organizationsService.findAll(query);
  }

  /**
   * Get a specific organization by ID
   * Public endpoint - anyone can view public organizations
   */
  @Get(':id')
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ORGANIZATION_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SOCIAL,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ORGANIZATION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.organizationsService.findById(id);
  }

  /**
   * Get organization by slug
   * Public endpoint for SEO-friendly URLs
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  /**
   * Update an organization
   * Only organization owners or admins can update organizations
   */
  @Patch(':id')
  @RequirePermissions({
    all: ['organization.update'],
    scopeType: 'organization',
    autoDetectScope: true,
  })
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ORGANIZATION_UPDATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SOCIAL,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ORGANIZATION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async update(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    return this.organizationsService.updateOrganization(
      id,
      updateOrganizationDto,
    );
  }

  /**
   * Soft delete an organization
   * Only organization owners can delete their organizations
   */
  @Delete(':id')
  @RequirePermissions({
    all: ['organization.delete'],
    scopeType: 'organization',
    autoDetectScope: true,
  })
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.ORGANIZATION_DELETE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SOCIAL,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.ORGANIZATION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async remove(@Param('id', SnowflakeIdPipe) id: string): Promise<void> {
    return this.organizationsService.remove(id);
  }

  /**
   * Get organization members with their roles
   * Requires permission to view organization members
   */
  @Get(':id/members')
  @RequirePermissions({
    all: ['organization.update'],
    scopeType: 'organization',
    autoDetectScope: true,
  })
  @Auth()
  async getOrganizationMembers(@Param('id', SnowflakeIdPipe) id: string) {
    return this.organizationsService.getOrganizationMembers(id);
  }

  /**
   * Assign a role to a user in an organization
   * Requires permission to manage organization members
   */
  @Post(':id/members/:userId/roles/:roleId')
  @RequirePermissions({
    all: ['organization.update'],
    scopeType: 'organization',
    autoDetectScope: true,
  })
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async assignOrganizationRole(
    @Param('id', SnowflakeIdPipe) organizationId: string,
    @Param('userId', SnowflakeIdPipe) userId: string,
    @Param('roleId', SnowflakeIdPipe) roleId: string,
  ) {
    return this.organizationsService.assignOrganizationRole(
      userId,
      organizationId,
      roleId,
    );
  }

  /**
   * Remove a role from a user in an organization
   * Requires permission to manage organization members
   */
  @Delete(':id/members/:userId/roles/:roleId')
  @RequirePermissions({
    all: ['organization.update'],
    scopeType: 'organization',
    autoDetectScope: true,
  })
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOrganizationRole(
    @Param('id', SnowflakeIdPipe) organizationId: string,
    @Param('userId', SnowflakeIdPipe) userId: string,
    @Param('roleId', SnowflakeIdPipe) roleId: string,
  ): Promise<void> {
    return this.organizationsService.removeOrganizationRole(
      userId,
      organizationId,
      roleId,
    );
  }

  /**
   * Get organizations owned by the authenticated user
   * Requires authentication
   */
  @Get('my/owned')
  @Auth()
  async findMyOwned(@Req() req: Request & { user: AuthPayload }) {
    return this.organizationsService.findByOwnerId(req.user.uid);
  }

  /**
   * Get organizations where the authenticated user is a member
   * Requires authentication
   */
  @Get('my/membership')
  @Auth()
  async findMyMemberships(@Req() req: Request & { user: AuthPayload }) {
    return this.organizationsService.findByMemberId(req.user.uid);
  }
}
