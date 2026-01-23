import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { TrackEvent } from 'src/analytics/decorators/track-event.decorator';
import { AnalyticsInterceptor } from 'src/analytics/interceptors/analytics.interceptor';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { ANALYTICS_CONSTANTS } from 'src/shared/constants/analytics.constants';
import { ContributionsService } from './contributions.service';
import {
  CreateContributionDto,
  QueryContributionDto,
  ReviewContributionDto,
} from './dto';
import { ContributionProcessorService } from './services/contribution-processor.service';

/**
 * Contributions Controller
 *
 * Handles HTTP requests for user contributions (create/update requests for entities).
 * Provides endpoints for submitting contributions and admin review.
 */
@Controller('contributions')
export class ContributionsController {
  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly contributionProcessorService: ContributionProcessorService,
  ) {}

  /**
   * Submit a new contribution
   * Requires authentication and contribution.create permission
   * @param createContributionDto Contribution data
   * @param req Request with authenticated user
   * @returns Created contribution entity
   */
  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_CREATE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async create(
    @Body() createContributionDto: CreateContributionDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.contributionsService.createContribution({
      ...createContributionDto,
      contributorId: req.user.uid,
    });
  }

  /**
   * Get all contributions with pagination
   * Requires authentication and contribution.manage permission (admin only)
   * @param queryDto Query parameters with filters and pagination
   * @returns Paginated list of contributions
   */
  @Get()
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findAll(@Query() queryDto: QueryContributionDto) {
    const extraFilter: Record<string, unknown> = {};
    if (queryDto.entityType) {
      extraFilter.entityType = queryDto.entityType;
    }
    if (queryDto.action) {
      extraFilter.action = queryDto.action;
    }
    if (queryDto.contributorId) {
      extraFilter.contributorId = queryDto.contributorId;
    }
    if (queryDto.entityId) {
      extraFilter.entityId = queryDto.entityId;
    }
    return this.contributionsService.listOffset(queryDto, extraFilter, {
      relations: ['contributor'],
    });
  }

  /**
   * Get pending contributions (for admin review)
   * Requires authentication and contribution.review permission
   * @param queryDto Query parameters with filters and pagination
   * @returns Paginated list of pending contributions
   */
  @Get('pending')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findPending(@Query() queryDto: QueryContributionDto) {
    return this.contributionsService.findPending(queryDto);
  }

  /**
   * Get my contributions (contributions submitted by current user)
   * Requires authentication
   * @param queryDto Query parameters with filters and pagination
   * @param req Request with authenticated user
   * @returns Paginated list of user's contributions
   */
  @Get('my')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_LIST,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findMy(
    @Query() queryDto: QueryContributionDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.contributionsService.findByContributor(req.user.uid, queryDto);
  }

  /**
   * Get a contribution by ID
   * Requires authentication
   * @param id Contribution ID (Snowflake ID)
   * @returns Contribution entity or null if not found
   */
  @Get(':id')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_VIEW,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async findOne(@Param('id', SnowflakeIdPipe) id: string) {
    return this.contributionsService.findById(id, {
      relations: ['contributor', 'reviewer'],
    });
  }

  /**
   * Approve a contribution
   * Requires authentication and contribution.review permission
   * @param id Contribution ID (Snowflake ID)
   * @param reviewDto Review data with optional admin notes
   * @param req Request with authenticated user (admin)
   * @returns Updated contribution entity
   */
  @Patch(':id/approve')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_APPROVE,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async approve(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() reviewDto: ReviewContributionDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    return this.contributionProcessorService.approveContribution(
      id,
      req.user.uid,
      reviewDto.adminNotes,
    );
  }

  /**
   * Reject a contribution
   * Requires authentication and contribution.review permission
   * @param id Contribution ID (Snowflake ID)
   * @param reviewDto Review data with rejection reason (required)
   * @param req Request with authenticated user (admin)
   * @returns Updated contribution entity
   */
  @Patch(':id/reject')
  @Auth()
  @TrackEvent(
    ANALYTICS_CONSTANTS.EVENT_TYPES.CONTRIBUTION_REJECT,
    ANALYTICS_CONSTANTS.EVENT_CATEGORIES.SYSTEM,
    ANALYTICS_CONSTANTS.SUBJECT_TYPES.CONTRIBUTION,
  )
  @UseInterceptors(AnalyticsInterceptor)
  async reject(
    @Param('id', SnowflakeIdPipe) id: string,
    @Body() reviewDto: ReviewContributionDto,
    @Request() req: Request & { user: AuthPayload },
  ) {
    if (!reviewDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.contributionProcessorService.rejectContribution(
      id,
      req.user.uid,
      reviewDto.rejectionReason,
      reviewDto.adminNotes,
    );
  }
}
