import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  CreateReportActionDto,
  ReportStatsDto,
} from './dto';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleGuard } from 'src/auth/guard/role.guard';
import { USER_CONSTANTS } from 'src/shared/constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Create a new report
   * POST /reports
   */
  @Post()
  @Auth()
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate report already exists',
  })
  async createReport(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateReportDto,
  ) {
    const userId = req.user.uid;
    return this.reportsService.createReport(userId, dto);
  }

  /**
   * Get reports with pagination and filtering
   * GET /reports
   */
  @Get()
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get reports with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
  })
  async getReports(@Query() dto: QueryReportsDto) {
    return this.reportsService.list(dto);
  }

  /**
   * Get a single report by ID
   * GET /reports/:id
   */
  @Get(':id')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get a single report by ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async getReport(@Param('id', new SnowflakeIdPipe()) reportId: string) {
    return this.reportsService.getById(reportId);
  }

  /**
   * Update a report
   * PUT /reports/:id
   */
  @Put(':id')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Update a report' })
  @ApiResponse({
    status: 200,
    description: 'Report updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async updateReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: UpdateReportDto,
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.updateReport(reportId, moderatorId, dto);
  }

  /**
   * Assign a report to a moderator
   * POST /reports/:id/assign
   */
  @Post(':id/assign')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Assign a report to a moderator' })
  @ApiResponse({
    status: 200,
    description: 'Report assigned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async assignReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { moderatorId: string },
  ) {
    return this.reportsService.assignReport(reportId, body.moderatorId);
  }

  /**
   * Resolve a report
   * POST /reports/:id/resolve
   */
  @Post(':id/resolve')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Resolve a report' })
  @ApiResponse({
    status: 200,
    description: 'Report resolved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async resolveReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body()
    body: {
      action: string;
      resolution: string;
      resolutionDetails?: string;
      moderatorNotes?: string;
    },
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.resolveReport(reportId, moderatorId, body);
  }

  /**
   * Dismiss a report
   * POST /reports/:id/dismiss
   */
  @Post(':id/dismiss')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Dismiss a report' })
  @ApiResponse({
    status: 200,
    description: 'Report dismissed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async dismissReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { reason: string },
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.dismissReport(
      reportId,
      moderatorId,
      body.reason,
    );
  }

  /**
   * Escalate a report
   * POST /reports/:id/escalate
   */
  @Post(':id/escalate')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Escalate a report' })
  @ApiResponse({
    status: 200,
    description: 'Report escalated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async escalateReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { reason: string },
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.escalateReport(
      reportId,
      moderatorId,
      body.reason,
    );
  }

  /**
   * Create a report action
   * POST /reports/:id/actions
   */
  @Post(':id/actions')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Create a report action' })
  @ApiResponse({
    status: 201,
    description: 'Report action created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async createReportAction(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: Omit<CreateReportActionDto, 'reportId'>,
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.createReportAction(moderatorId, {
      ...dto,
      reportId,
    });
  }

  /**
   * Get reports for specific content
   * GET /reports/content/:type/:id
   */
  @Get('content/:type/:id')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get reports for specific content' })
  @ApiResponse({
    status: 200,
    description: 'Reports for content retrieved successfully',
  })
  async getReportsForContent(
    @Param('type') reportableType: string,
    @Param('id', new SnowflakeIdPipe()) reportableId: string,
  ) {
    return this.reportsService.getReportsForContent(
      reportableType as any,
      reportableId,
    );
  }

  /**
   * Get duplicate reports
   * GET /reports/duplicates/:type/:id
   */
  @Get('duplicates/:type/:id')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get duplicate reports for content' })
  @ApiResponse({
    status: 200,
    description: 'Duplicate reports retrieved successfully',
  })
  async getDuplicateReports(
    @Param('type') reportableType: string,
    @Param('id', new SnowflakeIdPipe()) reportableId: string,
  ) {
    return this.reportsService.getDuplicateReports(
      reportableType as any,
      reportableId,
    );
  }

  /**
   * Merge duplicate reports
   * POST /reports/merge
   */
  @Post('merge')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Merge duplicate reports' })
  @ApiResponse({
    status: 200,
    description: 'Reports merged successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient reports to merge',
  })
  async mergeDuplicateReports(
    @Request() req: Request & { user: AuthPayload },
    @Body() body: { reportIds: string[] },
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.mergeDuplicateReports(
      body.reportIds,
      moderatorId,
    );
  }

  /**
   * Get report statistics
   * GET /reports/stats
   */
  @Get('stats')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get report statistics' })
  @ApiResponse({
    status: 200,
    description: 'Report statistics retrieved successfully',
  })
  async getReportStats(@Query() dto: ReportStatsDto) {
    return this.reportsService.getStats(dto);
  }

  /**
   * Get my reports (for regular users)
   * GET /reports/my
   */
  @Get('my')
  @Auth()
  @ApiOperation({ summary: 'Get my reports' })
  @ApiResponse({
    status: 200,
    description: 'User reports retrieved successfully',
  })
  async getMyReports(
    @Request() req: Request & { user: AuthPayload },
    @Query() dto: Omit<QueryReportsDto, 'userId'>,
  ) {
    const userId = req.user.uid;
    return this.reportsService.list({ ...dto, userId });
  }

  /**
   * Get reports assigned to me (for moderators)
   * GET /reports/assigned
   */
  @Get('assigned')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get reports assigned to me' })
  @ApiResponse({
    status: 200,
    description: 'Assigned reports retrieved successfully',
  })
  async getAssignedReports(
    @Request() req: Request & { user: AuthPayload },
    @Query() dto: Omit<QueryReportsDto, 'moderatorId'>,
  ) {
    const moderatorId = req.user.uid;
    return this.reportsService.list({ ...dto, moderatorId });
  }

  /**
   * Get pending reports (for moderators)
   * GET /reports/pending
   */
  @Get('pending')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get pending reports' })
  @ApiResponse({
    status: 200,
    description: 'Pending reports retrieved successfully',
  })
  async getPendingReports(@Query() dto: Omit<QueryReportsDto, 'status'>) {
    return this.reportsService.list({
      ...dto,
      status: 'pending' as any,
    });
  }

  /**
   * Get urgent reports (for moderators)
   * GET /reports/urgent
   */
  @Get('urgent')
  @Auth()
  @Roles(USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Get urgent reports' })
  @ApiResponse({
    status: 200,
    description: 'Urgent reports retrieved successfully',
  })
  async getUrgentReports(@Query() dto: Omit<QueryReportsDto, 'priority'>) {
    return this.reportsService.list({
      ...dto,
      priority: 'urgent' as any,
    });
  }
}
