import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  CreateReportActionDto,
  ReportStatsDto,
  ResolveReportDto,
  AssignReportDto,
  DismissReportDto,
  EscalateReportDto,
  MergeReportsDto,
} from './dto';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { SnowflakeIdPipe } from 'src/common/pipes';
import {
  USER_CONSTANTS,
  ReportableType,
  ReportStatus,
  ReportPriority,
} from 'src/shared/constants';

/**
 * Reports Controller
 *
 * Handles all report-related API endpoints
 * Provides CRUD operations for reports and report actions
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Create a new report
   */
  @Post()
  @Auth()
  createReport(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.createReport(req.user.uid, dto);
  }

  /**
   * Get reports with pagination and filtering
   */
  @Get()
  @Auth()
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getReports(@Query() dto: QueryReportsDto) {
    return this.reportsService.list(dto);
  }

  /**
   * Get a single report by ID
   */
  @Get(':id')
  @Auth()
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getReport(@Param('id', new SnowflakeIdPipe()) reportId: string) {
    return this.reportsService.getById(reportId);
  }

  /**
   * Update a report
   */
  @Put(':id')
  @Auth()
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  updateReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.updateReport(reportId, req.user.uid, dto);
  }

  /**
   * Assign a report to a moderator
   */
  @Post(':id/assign')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  assignReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: AssignReportDto,
  ) {
    return this.reportsService.assignReport(reportId, dto.moderatorId);
  }

  /**
   * Resolve a report
   */
  @Post(':id/resolve')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  resolveReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(reportId, req.user.uid, dto);
  }

  /**
   * Dismiss a report
   */
  @Post(':id/dismiss')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  dismissReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: DismissReportDto,
  ) {
    return this.reportsService.dismissReport(
      reportId,
      req.user.uid,
      dto.reason,
    );
  }

  /**
   * Escalate a report
   */
  @Post(':id/escalate')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  escalateReport(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: EscalateReportDto,
  ) {
    return this.reportsService.escalateReport(
      reportId,
      req.user.uid,
      dto.reason,
    );
  }

  /**
   * Create a report action
   */
  @Post(':id/actions')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  createReportAction(
    @Param('id', new SnowflakeIdPipe()) reportId: string,
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: Omit<CreateReportActionDto, 'reportId'>,
  ) {
    return this.reportsService.createReportAction(req.user.uid, {
      ...dto,
      reportId,
    });
  }

  /**
   * Get reports for specific content
   */
  @Get('content/:type/:id')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getReportsForContent(
    @Param('type') reportableType: string,
    @Param('id', new SnowflakeIdPipe()) reportableId: string,
  ) {
    return this.reportsService.getReportsForContent(
      reportableType as ReportableType,
      reportableId,
    );
  }

  /**
   * Get duplicate reports
   */
  @Get('duplicates/:type/:id')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getDuplicateReports(
    @Param('type') reportableType: string,
    @Param('id', new SnowflakeIdPipe()) reportableId: string,
  ) {
    return this.reportsService.getDuplicateReports(
      reportableType as ReportableType,
      reportableId,
    );
  }

  /**
   * Merge duplicate reports
   */
  @Post('merge')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  mergeDuplicateReports(
    @Request() req: Request & { user: AuthPayload },
    @Body() dto: MergeReportsDto,
  ) {
    return this.reportsService.mergeDuplicateReports(
      dto.reportIds,
      req.user.uid,
    );
  }

  /**
   * Get report statistics
   */
  @Get('stats')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getReportStats(@Query() dto: ReportStatsDto) {
    return this.reportsService.getStats(dto);
  }

  /**
   * Get my reports (for regular users)
   */
  @Get('my')
  @Auth()
  getMyReports(
    @Request() req: Request & { user: AuthPayload },
    @Query() dto: Omit<QueryReportsDto, 'userId'>,
  ) {
    return this.reportsService.list({ ...dto, userId: req.user.uid });
  }

  /**
   * Get reports assigned to me (for moderators)
   */
  @Get('assigned')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getAssignedReports(
    @Request() req: Request & { user: AuthPayload },
    @Query() dto: Omit<QueryReportsDto, 'moderatorId'>,
  ) {
    return this.reportsService.list({ ...dto, moderatorId: req.user.uid });
  }

  /**
   * Get pending reports (for moderators)
   */
  @Get('pending')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getPendingReports(@Query() dto: Omit<QueryReportsDto, 'status'>) {
    return this.reportsService.list({
      ...dto,
      status: 'pending' as ReportStatus,
    });
  }

  /**
   * Get urgent reports (for moderators)
   */
  @Get('urgent')
  @Auth([USER_CONSTANTS.ROLES.MODERATOR, USER_CONSTANTS.ROLES.ADMIN])
  getUrgentReports(@Query() dto: Omit<QueryReportsDto, 'priority'>) {
    return this.reportsService.list({
      ...dto,
      priority: 'urgent' as ReportPriority,
    });
  }
}
