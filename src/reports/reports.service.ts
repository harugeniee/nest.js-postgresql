import { IPagination, IPaginationCursor } from 'src/common/interface';
import { TypeOrmBaseRepository } from 'src/common/repositories/typeorm.base-repo';
import { BaseService } from 'src/common/services';
import { AdvancedPaginationDto, CursorPaginationDto } from 'src/common/dto';
import { CacheService, RabbitMQService } from 'src/shared/services';
import {
  REPORT_CONSTANTS,
  ReportStatus,
  ReportPriority,
  ReportableType,
  ReportReason,
  ReportAction as ReportActionType,
  ReportResolution,
  JOB_NAME,
} from 'src/shared/constants';
import {
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Repository,
  Between,
  LessThan,
  MoreThanOrEqual,
} from 'typeorm';

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  CreateReportActionDto,
  ReportStatsDto,
} from './dto';
import {
  ReportStatsResponse,
  BasicReportCounts,
  ReportFieldStats,
  TopUser,
  TopModerator,
  RecentTrend,
} from './interfaces/report-stats.interface';
import { Report, ReportAction } from './entities';

@Injectable()
export class ReportsService extends BaseService<Report> {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportAction)
    private readonly reportActionRepository: Repository<ReportAction>,
    private readonly rabbitMQService: RabbitMQService,
    cacheService: CacheService,
  ) {
    super(
      new TypeOrmBaseRepository<Report>(reportRepository),
      {
        entityName: 'Report',
        cache: { enabled: true, ttlSec: 300, prefix: 'reports', swrSec: 60 },
        defaultSearchField: 'description',
        relationsWhitelist: {
          user: true,
          moderator: true,
          actions: { moderator: true },
        },
        emitEvents: false, // Disable EventEmitter, use RabbitMQ instead
      },
      cacheService,
    );
  }

  /**
   * Define searchable columns for Report entity
   * @returns Array of searchable column names
   */
  protected getSearchableColumns(): (keyof Report)[] {
    return ['description', 'moderatorNotes', 'resolutionDetails'];
  }

  /**
   * Lifecycle hook: Before creating a report
   * @param data - Report data to be created
   * @returns Processed report data
   */
  protected async beforeCreate(
    data: Partial<Report>,
  ): Promise<Partial<Report>> {
    // Check for duplicate reports
    const existingReport = await this.findOne({
      userId: data.userId,
      reportableType: data.reportableType,
      reportableId: data.reportableId,
      reason: data.reason,
    });

    if (existingReport?.isPending()) {
      throw new HttpException(
        { messageKey: 'report.DUPLICATE_REPORT' },
        HttpStatus.CONFLICT,
      );
    }

    // Set default priority based on reason
    if (!data.priority && data.reason) {
      data.priority = this.getDefaultPriorityForReason(data.reason);
    }

    // Set default status
    if (!data.status) {
      data.status = REPORT_CONSTANTS.STATUS.PENDING;
    }

    return data;
  }

  /**
   * Lifecycle hook: After creating a report
   * @param report - Created report entity
   */
  protected async afterCreate(report: Report): Promise<void> {
    // Send event to RabbitMQ
    await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.REPORT_CREATED,
      {
        reportId: report.id,
        userId: report.userId,
        reportableType: report.reportableType,
        reportableId: report.reportableId,
        reason: report.reason,
        priority: report.priority,
      },
    );

    // Check for auto-escalation
    await this.checkAutoEscalation(report);

    // Clear related cache
    await this.clearReportCache();
  }

  /**
   * Lifecycle hook: After updating a report
   * @param report - Updated report entity
   */
  protected async afterUpdate(report: Report): Promise<void> {
    // Send event to RabbitMQ
    await this.rabbitMQService.sendDataToRabbitMQAsync(
      JOB_NAME.REPORT_UPDATED,
      {
        reportId: report.id,
        status: report.status,
        action: report.action,
        moderatorId: report.moderatorId,
      },
    );

    // Clear related cache
    await this.clearReportCache();
  }

  /**
   * Create a new report
   * @param userId - ID of the user creating the report
   * @param dto - Report creation data
   * @returns Created report with relations
   */
  async createReport(userId: string, dto: CreateReportDto): Promise<Report> {
    return await this.runInTransaction(async (queryRunner) => {
      // Create the report using BaseService.create
      const report = await this.create(
        {
          userId,
          reportableType: dto.reportableType,
          reportableId: dto.reportableId,
          reason: dto.reason,
          description: dto.description,
          priority: dto.priority || REPORT_CONSTANTS.PRIORITY.MEDIUM,
          isAutoGenerated: dto.isAutoGenerated || false,
          metadata: dto.metadata,
        },
        { queryRunner },
      );

      // Fetch the complete report with relations
      const completeReport = await this.findOne(
        { id: report.id },
        {
          relations: ['user', 'moderator', 'actions', 'actions.moderator'],
        },
      );

      if (!completeReport) {
        throw new HttpException(
          { messageKey: 'report.REPORT_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      return completeReport;
    });
  }

  /**
   * Update an existing report
   * @param reportId - ID of the report to update
   * @param moderatorId - ID of the moderator updating the report
   * @param dto - Report update data
   * @returns Updated report
   */
  async updateReport(
    reportId: string,
    moderatorId: string,
    dto: UpdateReportDto,
  ): Promise<Report> {
    try {
      return await this.runInTransaction(async (queryRunner) => {
        // Update report fields
        const updateData: Partial<Report> = {
          ...dto,
          moderatorId,
        } as Partial<Report>;

        // Set assignedAt if moderator is being assigned
        if (dto.moderatorId && !dto.assignedAt) {
          updateData.assignedAt = new Date();
        }

        // Set resolvedAt if status is being changed to resolved
        if (
          dto.status === REPORT_CONSTANTS.STATUS.RESOLVED &&
          !dto.resolvedAt
        ) {
          updateData.resolvedAt = new Date();
        }

        // Use BaseService.update which will trigger lifecycle hooks
        await this.update(reportId, updateData, { queryRunner });

        // Fetch the complete report with relations
        const completeReport = await this.findOne(
          { id: reportId },
          {
            relations: ['user', 'moderator', 'actions', 'actions.moderator'],
          },
        );

        if (!completeReport) {
          throw new HttpException(
            { messageKey: 'report.REPORT_NOT_FOUND' },
            HttpStatus.NOT_FOUND,
          );
        }

        return completeReport;
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { messageKey: 'common.INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get reports with pagination and filtering
   * @param dto - Query parameters
   * @returns Paginated reports
   */
  async list(dto: QueryReportsDto): Promise<IPagination<Report>> {
    const {
      status,
      priority,
      reportableType,
      reason,
      userId,
      moderatorId,
      reportableId,
      isAutoGenerated,
      createdAfter,
      createdBefore,
      assignedAfter,
      assignedBefore,
      resolvedAfter,
      resolvedBefore,
      minDuplicateCount,
      maxDuplicateCount,
      ...paginationDto
    } = dto;

    // Build where condition
    const whereCondition = this.buildListWhereCondition({
      status,
      priority,
      reportableType,
      reason,
      userId,
      moderatorId,
      reportableId,
      isAutoGenerated,
      createdAfter,
      createdBefore,
      assignedAfter,
      assignedBefore,
      resolvedAfter,
      resolvedBefore,
      minDuplicateCount,
      maxDuplicateCount,
    });

    // Use BaseService.listOffset for pagination
    return await this.listOffset(paginationDto, whereCondition, {
      relations: ['user', 'moderator', 'actions', 'actions.moderator'],
    });
  }

  /**
   * Build where condition for list queries
   * @param filters - Filter parameters
   * @returns Where condition object
   */
  private buildListWhereCondition(filters: {
    status?: ReportStatus;
    priority?: ReportPriority;
    reportableType?: ReportableType;
    reason?: ReportReason;
    userId?: string;
    moderatorId?: string;
    reportableId?: string;
    isAutoGenerated?: boolean;
    createdAfter?: string;
    createdBefore?: string;
    assignedAfter?: string;
    assignedBefore?: string;
    resolvedAfter?: string;
    resolvedBefore?: string;
    minDuplicateCount?: number;
    maxDuplicateCount?: number;
  }): FindOptionsWhere<Report> {
    const whereCondition: FindOptionsWhere<Report> = {};

    // Basic filters
    if (filters.status) whereCondition.status = filters.status;
    if (filters.priority) whereCondition.priority = filters.priority;
    if (filters.reportableType)
      whereCondition.reportableType = filters.reportableType;
    if (filters.reason) whereCondition.reason = filters.reason;
    if (filters.userId) whereCondition.userId = filters.userId;
    if (filters.moderatorId) whereCondition.moderatorId = filters.moderatorId;
    if (filters.reportableId)
      whereCondition.reportableId = filters.reportableId;
    if (filters.isAutoGenerated !== undefined)
      whereCondition.isAutoGenerated = filters.isAutoGenerated;

    // Date filters
    this.applyDateFilters(whereCondition, filters);

    // Duplicate count filters
    this.applyDuplicateCountFilters(whereCondition, filters);

    return whereCondition;
  }

  /**
   * Apply date filters to where condition
   * @param whereCondition - Where condition to modify
   * @param filters - Filter parameters
   */
  private applyDateFilters(
    whereCondition: FindOptionsWhere<Report>,
    filters: {
      createdAfter?: string;
      createdBefore?: string;
      assignedAfter?: string;
      assignedBefore?: string;
      resolvedAfter?: string;
      resolvedBefore?: string;
    },
  ): void {
    if (filters.createdAfter || filters.createdBefore) {
      whereCondition.createdAt = Between(
        filters.createdAfter ? new Date(filters.createdAfter) : new Date(0),
        filters.createdBefore ? new Date(filters.createdBefore) : new Date(),
      );
    }

    if (filters.assignedAfter || filters.assignedBefore) {
      whereCondition.assignedAt = Between(
        filters.assignedAfter ? new Date(filters.assignedAfter) : new Date(0),
        filters.assignedBefore ? new Date(filters.assignedBefore) : new Date(),
      );
    }

    if (filters.resolvedAfter || filters.resolvedBefore) {
      whereCondition.resolvedAt = Between(
        filters.resolvedAfter ? new Date(filters.resolvedAfter) : new Date(0),
        filters.resolvedBefore ? new Date(filters.resolvedBefore) : new Date(),
      );
    }
  }

  /**
   * Apply duplicate count filters to where condition
   * @param whereCondition - Where condition to modify
   * @param filters - Filter parameters
   */
  private applyDuplicateCountFilters(
    whereCondition: FindOptionsWhere<Report>,
    filters: {
      minDuplicateCount?: number;
      maxDuplicateCount?: number;
    },
  ): void {
    if (filters.minDuplicateCount !== undefined) {
      whereCondition.duplicateCount = MoreThanOrEqual(
        filters.minDuplicateCount,
      );
    }
    if (filters.maxDuplicateCount !== undefined) {
      whereCondition.duplicateCount = LessThan(filters.maxDuplicateCount);
    }
  }

  /**
   * Get a single report by ID
   * @param reportId - ID of the report
   * @returns Report with relations
   */
  async getById(reportId: string): Promise<Report> {
    return await this.findById(reportId, {
      relations: ['user', 'moderator', 'actions', 'actions.moderator'],
    });
  }

  /**
   * Get reports with offset pagination
   * @param paginationDto - Pagination parameters
   * @returns Paginated reports
   */
  async findAll(
    paginationDto: AdvancedPaginationDto,
  ): Promise<IPagination<Report>> {
    return this.listOffset(
      paginationDto,
      {},
      {
        relations: ['user', 'moderator', 'actions', 'actions.moderator'],
      },
    );
  }

  /**
   * Get reports with cursor pagination
   * @param paginationDto - Cursor pagination parameters
   * @returns Cursor paginated reports
   */
  async findAllCursor(
    paginationDto: CursorPaginationDto,
  ): Promise<IPaginationCursor<Report>> {
    return this.listCursor(
      paginationDto,
      {},
      {
        relations: ['user', 'moderator', 'actions', 'actions.moderator'],
      },
    );
  }

  /**
   * Create a report action
   * @param moderatorId - ID of the moderator performing the action
   * @param dto - Action creation data
   * @returns Created report action
   */
  async createReportAction(
    moderatorId: string,
    dto: CreateReportActionDto,
  ): Promise<ReportAction> {
    return await this.runInTransaction(async (queryRunner) => {
      // Verify report exists
      const report = await this.findById(dto.reportId);
      if (!report) {
        throw new HttpException(
          { messageKey: 'report.REPORT_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Create the action
      const action = this.reportActionRepository.create({
        reportId: dto.reportId,
        moderatorId,
        action: dto.action,
        description: dto.description,
        notes: dto.notes,
        metadata: dto.metadata,
      });

      const savedAction = await queryRunner.manager.save(ReportAction, action);

      // Update report with action details
      await queryRunner.manager.update(Report, dto.reportId, {
        action: dto.action,
        moderatorId,
        status: this.getStatusFromAction(dto.action),
        updatedAt: new Date(),
      });

      // Send event to RabbitMQ
      await this.rabbitMQService.sendDataToRabbitMQAsync(
        JOB_NAME.REPORT_ACTION_CREATED,
        {
          reportId: dto.reportId,
          actionId: savedAction.id,
          action: dto.action,
          moderatorId,
        },
      );

      return savedAction;
    });
  }

  /**
   * Get report statistics
   * @param dto - Statistics query parameters
   * @returns Report statistics
   */
  async getStats(dto: ReportStatsDto): Promise<ReportStatsResponse> {
    const cacheKey = `reports:stats:${JSON.stringify(dto)}`;
    const cached = await this.cacheService?.get(cacheKey);
    if (cached) {
      return cached as ReportStatsResponse;
    }

    // Build where condition
    const whereCondition = this.buildStatsWhereCondition(dto);

    // Calculate all statistics in parallel
    const [
      basicCounts,
      fieldStats,
      averageResolutionTime,
      topUsers,
      topModerators,
      recentTrends,
    ] = await Promise.all([
      this.calculateBasicCounts(whereCondition),
      this.calculateFieldStats(whereCondition),
      this.calculateAverageResolutionTime(whereCondition),
      this.getTopUsers(whereCondition),
      this.getTopModerators(whereCondition),
      this.getRecentTrends(whereCondition, dto.groupBy),
    ]);

    const stats: ReportStatsResponse = {
      ...basicCounts,
      ...fieldStats,
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      topUsers,
      topModerators,
      recentTrends,
    };

    // Cache the results
    await this.cacheService?.set(
      cacheKey,
      stats,
      REPORT_CONSTANTS.CACHE.STATS_TTL_SEC,
    );

    return stats;
  }

  /**
   * Build where condition for statistics queries
   * @param dto - Statistics query parameters
   * @returns Where condition object
   */
  private buildStatsWhereCondition(
    dto: ReportStatsDto,
  ): FindOptionsWhere<Report> {
    const whereCondition: FindOptionsWhere<Report> = {};

    if (dto.status) whereCondition.status = dto.status;
    if (dto.priority) whereCondition.priority = dto.priority;
    if (dto.reportableType) whereCondition.reportableType = dto.reportableType;
    if (dto.reason) whereCondition.reason = dto.reason;
    if (dto.userId) whereCondition.userId = dto.userId;
    if (dto.moderatorId) whereCondition.moderatorId = dto.moderatorId;

    // Date filters
    if (dto.startDate || dto.endDate) {
      whereCondition.createdAt = Between(
        dto.startDate ? new Date(dto.startDate) : new Date(0),
        dto.endDate ? new Date(dto.endDate) : new Date(),
      );
    }

    return whereCondition;
  }

  /**
   * Calculate basic report counts
   * @param whereCondition - Where condition for filtering
   * @returns Basic report counts
   */
  private async calculateBasicCounts(
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<BasicReportCounts> {
    const [
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      escalatedReports,
    ] = await Promise.all([
      this.reportRepository.count({ where: whereCondition }),
      this.reportRepository.count({
        where: { ...whereCondition, status: REPORT_CONSTANTS.STATUS.PENDING },
      }),
      this.reportRepository.count({
        where: {
          ...whereCondition,
          status: REPORT_CONSTANTS.STATUS.UNDER_REVIEW,
        },
      }),
      this.reportRepository.count({
        where: { ...whereCondition, status: REPORT_CONSTANTS.STATUS.RESOLVED },
      }),
      this.reportRepository.count({
        where: { ...whereCondition, status: REPORT_CONSTANTS.STATUS.DISMISSED },
      }),
      this.reportRepository.count({
        where: { ...whereCondition, status: REPORT_CONSTANTS.STATUS.ESCALATED },
      }),
    ]);

    return {
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      escalatedReports,
    };
  }

  /**
   * Calculate field-based statistics
   * @param whereCondition - Where condition for filtering
   * @returns Field statistics
   */
  private async calculateFieldStats(
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<ReportFieldStats> {
    const [reportsByStatus, reportsByPriority, reportsByType, reportsByReason] =
      await Promise.all([
        this.getReportsByField('status', whereCondition),
        this.getReportsByField('priority', whereCondition),
        this.getReportsByField('reportableType', whereCondition),
        this.getReportsByField('reason', whereCondition),
      ]);

    return {
      reportsByStatus,
      reportsByPriority,
      reportsByType,
      reportsByReason,
    };
  }

  /**
   * Calculate average resolution time
   * @param whereCondition - Where condition for filtering
   * @returns Average resolution time in days
   */
  private async calculateAverageResolutionTime(
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<number> {
    const resolvedReportsWithTimes = await this.reportRepository.find({
      where: {
        ...whereCondition,
        status: REPORT_CONSTANTS.STATUS.RESOLVED,
        resolvedAt: Not(IsNull()),
      },
      select: ['createdAt', 'resolvedAt'],
    });

    if (resolvedReportsWithTimes.length === 0) {
      return 0;
    }

    const totalResolutionTime = resolvedReportsWithTimes.reduce(
      (sum, report) => {
        const resolutionTime =
          report.resolvedAt!.getTime() - report.createdAt.getTime();
        return sum + resolutionTime;
      },
      0,
    );

    return (
      totalResolutionTime /
      resolvedReportsWithTimes.length /
      (1000 * 60 * 60 * 24)
    ); // Convert to days
  }

  /**
   * Assign a report to a moderator
   * @param reportId - ID of the report
   * @param moderatorId - ID of the moderator
   * @returns Updated report
   */
  async assignReport(reportId: string, moderatorId: string): Promise<Report> {
    return await this.updateReport(reportId, moderatorId, {
      moderatorId,
      status: REPORT_CONSTANTS.STATUS.UNDER_REVIEW,
      assignedAt: new Date(),
    });
  }

  /**
   * Resolve a report
   * @param reportId - ID of the report
   * @param moderatorId - ID of the moderator
   * @param resolution - Resolution details
   * @returns Updated report
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    resolution: {
      action: ReportActionType;
      resolution: ReportResolution;
      resolutionDetails?: string;
      moderatorNotes?: string;
    },
  ): Promise<Report> {
    return await this.updateReport(reportId, moderatorId, {
      ...resolution,
      status: REPORT_CONSTANTS.STATUS.RESOLVED,
      resolvedAt: new Date(),
    });
  }

  /**
   * Dismiss a report
   * @param reportId - ID of the report
   * @param moderatorId - ID of the moderator
   * @param reason - Reason for dismissal
   * @returns Updated report
   */
  async dismissReport(
    reportId: string,
    moderatorId: string,
    reason: string,
  ): Promise<Report> {
    return await this.updateReport(reportId, moderatorId, {
      status: REPORT_CONSTANTS.STATUS.DISMISSED,
      action: REPORT_CONSTANTS.ACTIONS.REPORT_DISMISSED,
      resolution: REPORT_CONSTANTS.RESOLUTION.DISMISSED,
      resolutionDetails: reason,
      resolvedAt: new Date(),
    });
  }

  /**
   * Escalate a report
   * @param reportId - ID of the report
   * @param moderatorId - ID of the moderator
   * @param reason - Reason for escalation
   * @returns Updated report
   */
  async escalateReport(
    reportId: string,
    moderatorId: string,
    reason: string,
  ): Promise<Report> {
    return await this.updateReport(reportId, moderatorId, {
      status: REPORT_CONSTANTS.STATUS.ESCALATED,
      action: REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_ADMIN,
      resolution: REPORT_CONSTANTS.RESOLUTION.ESCALATED,
      resolutionDetails: reason,
    });
  }

  /**
   * Get reports for a specific content item
   * @param reportableType - Type of content
   * @param reportableId - ID of content
   * @returns Array of reports
   */
  async getReportsForContent(
    reportableType: ReportableType,
    reportableId: string,
  ): Promise<Report[]> {
    // Use repository directly for custom ordering and relations
    return await this.reportRepository.find({
      where: { reportableType, reportableId },
      relations: ['user', 'moderator', 'actions', 'actions.moderator'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get duplicate reports for the same content
   * @param reportableType - Type of content
   * @param reportableId - ID of content
   * @returns Array of duplicate reports
   */
  async getDuplicateReports(
    reportableType: ReportableType,
    reportableId: string,
  ): Promise<Report[]> {
    // Use repository directly for custom ordering and relations
    return await this.reportRepository.find({
      where: { reportableType, reportableId },
      relations: ['user', 'moderator'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Merge duplicate reports
   * @param reportIds - Array of report IDs to merge
   * @param moderatorId - ID of the moderator performing the merge
   * @returns Primary report with updated duplicate count
   */
  async mergeDuplicateReports(
    reportIds: string[],
    moderatorId: string,
  ): Promise<Report> {
    if (reportIds.length < 2) {
      throw new HttpException(
        { messageKey: 'report.INSUFFICIENT_REPORTS_TO_MERGE' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.runInTransaction(async (queryRunner) => {
      // Get all reports
      const reports = await queryRunner.manager.find(Report, {
        where: { id: In(reportIds) },
        order: { createdAt: 'ASC' },
      });

      if (reports.length !== reportIds.length) {
        throw new HttpException(
          { messageKey: 'report.REPORTS_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Use the oldest report as primary
      const primaryReport = reports[0];
      const duplicateReports = reports.slice(1);

      // Update duplicate count
      primaryReport.duplicateCount = reports.length;

      // Mark duplicate reports as merged
      for (const duplicateReport of duplicateReports) {
        duplicateReport.status = REPORT_CONSTANTS.STATUS.RESOLVED;
        duplicateReport.action = REPORT_CONSTANTS.ACTIONS.REPORT_MERGED;
        duplicateReport.resolution = REPORT_CONSTANTS.RESOLUTION.MERGED;
        duplicateReport.moderatorId = moderatorId;
        duplicateReport.resolvedAt = new Date();
        duplicateReport.resolutionDetails = `Merged with report ${primaryReport.id}`;

        await queryRunner.manager.save(Report, duplicateReport);
      }

      // Save primary report
      await queryRunner.manager.save(Report, primaryReport);

      return primaryReport;
    });
  }

  /**
   * Get default priority for a report reason
   * @param reason - Report reason
   * @returns Priority level
   */
  private getDefaultPriorityForReason(reason: ReportReason): ReportPriority {
    const highPriorityReasons: ReportReason[] = [
      REPORT_CONSTANTS.REASONS.CHILD_ABUSE,
      REPORT_CONSTANTS.REASONS.TERRORISM,
      REPORT_CONSTANTS.REASONS.EXTREMISM,
      REPORT_CONSTANTS.REASONS.SELF_HARM,
      REPORT_CONSTANTS.REASONS.SUICIDE,
      REPORT_CONSTANTS.REASONS.THREATS,
      REPORT_CONSTANTS.REASONS.VIOLENCE,
      REPORT_CONSTANTS.REASONS.GRAPHIC_VIOLENCE,
    ];

    const urgentReasons: ReportReason[] = [
      REPORT_CONSTANTS.REASONS.CHILD_ABUSE,
      REPORT_CONSTANTS.REASONS.TERRORISM,
      REPORT_CONSTANTS.REASONS.SUICIDE,
    ];

    if (urgentReasons.includes(reason)) {
      return REPORT_CONSTANTS.PRIORITY.URGENT;
    }

    if (highPriorityReasons.includes(reason)) {
      return REPORT_CONSTANTS.PRIORITY.HIGH;
    }

    return REPORT_CONSTANTS.PRIORITY.MEDIUM;
  }

  /**
   * Get status from action
   * @param action - Report action
   * @returns Status
   */
  private getStatusFromAction(action: ReportActionType): ReportStatus {
    const resolvedActions: ReportActionType[] = [
      REPORT_CONSTANTS.ACTIONS.CONTENT_REMOVED,
      REPORT_CONSTANTS.ACTIONS.CONTENT_HIDDEN,
      REPORT_CONSTANTS.ACTIONS.CONTENT_EDITED,
      REPORT_CONSTANTS.ACTIONS.USER_WARNED,
      REPORT_CONSTANTS.ACTIONS.USER_SUSPENDED,
      REPORT_CONSTANTS.ACTIONS.USER_BANNED,
      REPORT_CONSTANTS.ACTIONS.ACCOUNT_DELETED,
    ];

    const dismissedActions: ReportActionType[] = [
      REPORT_CONSTANTS.ACTIONS.REPORT_DISMISSED,
      REPORT_CONSTANTS.ACTIONS.NO_ACTION,
    ];

    const escalatedActions: ReportActionType[] = [
      REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_ADMIN,
      REPORT_CONSTANTS.ACTIONS.ESCALATED_TO_LEGAL,
    ];

    if (resolvedActions.includes(action)) {
      return REPORT_CONSTANTS.STATUS.RESOLVED;
    }

    if (dismissedActions.includes(action)) {
      return REPORT_CONSTANTS.STATUS.DISMISSED;
    }

    if (escalatedActions.includes(action)) {
      return REPORT_CONSTANTS.STATUS.ESCALATED;
    }

    return REPORT_CONSTANTS.STATUS.UNDER_REVIEW;
  }

  /**
   * Check for auto-escalation
   * @param report - Report to check
   */
  private async checkAutoEscalation(report: Report): Promise<void> {
    // Check if this is a high-priority reason that should be auto-escalated
    const autoEscalateReasons: ReportReason[] = [
      REPORT_CONSTANTS.REASONS.CHILD_ABUSE,
      REPORT_CONSTANTS.REASONS.TERRORISM,
      REPORT_CONSTANTS.REASONS.SUICIDE,
    ];

    if (autoEscalateReasons.includes(report.reason)) {
      await this.escalateReport(
        report.id,
        'system',
        'Auto-escalated due to high-priority reason',
      );
    }

    // Check for duplicate reports that might need escalation
    const duplicateReports = await this.getDuplicateReports(
      report.reportableType,
      report.reportableId,
    );

    if (
      duplicateReports.length >=
      REPORT_CONSTANTS.AUTO_RESOLUTION.ESCALATION_THRESHOLD
    ) {
      await this.escalateReport(
        report.id,
        'system',
        `Auto-escalated due to ${duplicateReports.length} duplicate reports`,
      );
    }
  }

  /**
   * Get reports by field for statistics
   * @param field - Field to group by
   * @param whereCondition - Where condition
   * @returns Statistics by field
   */
  private async getReportsByField(
    field: keyof Report,
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<Record<string, number>> {
    const reports = await this.reportRepository.find({
      where: whereCondition,
      select: [field],
    });

    return reports.reduce(
      (acc, report) => {
        const value = report[field] as string;
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get top users
   * @param whereCondition - Where condition
   * @returns Top users
   */
  private async getTopUsers(
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<TopUser[]> {
    const reports = await this.reportRepository.find({
      where: whereCondition,
      select: ['userId'],
    });

    const userCounts: Record<string, number> = {};
    reports.forEach((report) => {
      userCounts[report.userId] = (userCounts[report.userId] || 0) + 1;
    });

    return Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get top moderators
   * @param whereCondition - Where condition
   * @returns Top moderators
   */
  private async getTopModerators(
    whereCondition: FindOptionsWhere<Report>,
  ): Promise<TopModerator[]> {
    const reports = await this.reportRepository.find({
      where: { ...whereCondition, moderatorId: Not(IsNull()) },
      select: ['moderatorId'],
    });

    const moderatorCounts: Record<string, number> = {};
    reports.forEach((report) => {
      if (report.moderatorId) {
        moderatorCounts[report.moderatorId] =
          (moderatorCounts[report.moderatorId] || 0) + 1;
      }
    });

    return Object.entries(moderatorCounts)
      .map(([moderatorId, count]) => ({ moderatorId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get recent trends
   * @param whereCondition - Where condition
   * @param groupBy - Group by period
   * @returns Recent trends
   */
  private async getRecentTrends(
    whereCondition: FindOptionsWhere<Report>,
    groupBy?: 'hour' | 'day' | 'week' | 'month' | 'year',
  ): Promise<RecentTrend[]> {
    const period = groupBy || 'day';

    // Get reports with createdAt field using repository directly
    const reports = await this.reportRepository.find({
      where: whereCondition,
      select: ['createdAt'],
      order: { createdAt: 'DESC' },
    });

    // Group by date based on period
    const dateCounts: Record<string, number> = {};
    reports.forEach((report) => {
      let dateKey: string;
      const date = new Date(report.createdAt);

      switch (period) {
        case 'hour':
          dateKey = date.toISOString().slice(0, 13) + ':00:00';
          break;
        case 'day':
          dateKey = date.toISOString().slice(0, 10);
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().slice(0, 10);
          break;
        }
        case 'month':
          dateKey = date.toISOString().slice(0, 7);
          break;
        case 'year':
          dateKey = date.toISOString().slice(0, 4);
          break;
        default:
          dateKey = date.toISOString().slice(0, 10);
      }

      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    return Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
  }

  /**
   * Clear report-related cache
   */
  private async clearReportCache(): Promise<void> {
    if (!this.cacheService) return;

    await Promise.all([
      this.cacheService.deleteKeysByPattern('reports:*'),
      this.cacheService.deleteKeysByPattern('reports:stats:*'),
    ]);
  }
}
