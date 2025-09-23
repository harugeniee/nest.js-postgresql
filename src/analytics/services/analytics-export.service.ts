import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AnalyticsMetric } from '../entities/analytics-metric.entity';
import {
  AnalyticsExportQueryDto,
  AnalyticsExportResponseDto,
} from '../dto/dashboard-response.dto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analytics Export Service
 *
 * Service for exporting analytics data in various formats
 */
@Injectable()
export class AnalyticsExportService {
  private readonly exportDir = join(process.cwd(), 'exports', 'analytics');

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsMetric)
    private readonly analyticsMetricRepository: Repository<AnalyticsMetric>,
  ) {
    this.ensureExportDirectory();
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    query: AnalyticsExportQueryDto,
  ): Promise<AnalyticsExportResponseDto> {
    const exportId = uuidv4();
    const filename = `analytics_export_${exportId}.${query.format}`;
    const filePath = join(this.exportDir, filename);

    // Build date condition
    const dateCondition = this.buildDateCondition(query);

    // Get data based on export options
    const exportData = await this.prepareExportData(query, dateCondition);

    // Generate file based on format
    await this.generateExportFile(exportData, filePath, query.format);

    // Get file size
    const stats = await import('fs').then((fs) => fs.promises.stat(filePath));
    const fileSize = stats.size;

    // Set expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      downloadUrl: `/exports/analytics/${filename}`,
      filename,
      format: query.format,
      size: fileSize,
      expiresAt,
      metadata: {
        totalRecords: exportData.totalRecords,
        dateRange: {
          from:
            query.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: query.toDate || new Date(),
        },
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Prepare export data based on query options
   */
  private async prepareExportData(
    query: AnalyticsExportQueryDto,
    dateCondition: any,
  ) {
    const data: any = {
      metadata: {
        exportDate: new Date(),
        dateRange: {
          from: query.fromDate,
          to: query.toDate,
        },
        format: query.format,
        options: {
          includeRawData: query.includeRawData,
          includeAggregatedData: query.includeAggregatedData,
          includeChartsData: query.includeChartsData,
        },
      },
      totalRecords: 0,
    };

    // Include raw data if requested
    if (query.includeRawData) {
      const rawEvents = await this.getRawEventsData(dateCondition, query);
      data.rawEvents = rawEvents;
      data.totalRecords += rawEvents.length;
    }

    // Include aggregated data if requested
    if (query.includeAggregatedData) {
      const aggregatedData = await this.getAggregatedData(dateCondition);
      data.aggregatedData = aggregatedData;
    }

    // Include charts data if requested
    if (query.includeChartsData) {
      const chartsData = await this.getChartsData(dateCondition);
      data.chartsData = chartsData;
    }

    return data;
  }

  /**
   * Get raw events data
   */
  private async getRawEventsData(
    dateCondition: any,
    query: AnalyticsExportQueryDto,
  ) {
    const events = await this.analyticsEventRepository.find({
      where: { createdAt: dateCondition },
      order: { createdAt: 'DESC' },
      take: query.limit || 10000,
      skip: ((query.page || 1) - 1) * (query.limit || 10000),
    });

    return events.map((event) => ({
      id: event.id,
      userId: event.userId,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      eventData: event.eventData,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  }

  /**
   * Get aggregated data
   */
  private async getAggregatedData(dateCondition: any) {
    const [
      eventTypeSummary,
      eventCategorySummary,
      subjectTypeSummary,
      userActivitySummary,
      timeSeriesData,
    ] = await Promise.all([
      this.getEventTypeSummary(dateCondition),
      this.getEventCategorySummary(dateCondition),
      this.getSubjectTypeSummary(dateCondition),
      this.getUserActivitySummary(dateCondition),
      this.getTimeSeriesData(dateCondition),
    ]);

    return {
      eventTypeSummary,
      eventCategorySummary,
      subjectTypeSummary,
      userActivitySummary,
      timeSeriesData,
    };
  }

  /**
   * Get charts data
   */
  private async getChartsData(dateCondition: any) {
    const [dailyEvents, hourlyEvents, topEvents, topUsers, topContent] =
      await Promise.all([
        this.getDailyEventsChart(dateCondition),
        this.getHourlyEventsChart(dateCondition),
        this.getTopEventsChart(dateCondition),
        this.getTopUsersChart(dateCondition),
        this.getTopContentChart(dateCondition),
      ]);

    return {
      dailyEvents,
      hourlyEvents,
      topEvents,
      topUsers,
      topContent,
    };
  }

  /**
   * Generate export file based on format
   */
  private async generateExportFile(
    data: any,
    filePath: string,
    format: string,
  ) {
    switch (format) {
      case 'json':
        await this.generateJsonFile(data, filePath);
        break;
      case 'csv':
        await this.generateCsvFile(data, filePath);
        break;
      case 'xlsx':
        await this.generateExcelFile(data, filePath);
        break;
      case 'pdf':
        await this.generatePdfFile(data, filePath);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate JSON file
   */
  private async generateJsonFile(data: any, filePath: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    await writeFile(filePath, jsonContent, 'utf8');
  }

  /**
   * Generate CSV file
   */
  private async generateCsvFile(data: any, filePath: string) {
    let csvContent = '';

    // Add metadata
    csvContent += 'METADATA\n';
    csvContent += `Export Date,${data.metadata.exportDate}\n`;
    csvContent += `Date Range From,${data.metadata.dateRange.from}\n`;
    csvContent += `Date Range To,${data.metadata.dateRange.to}\n`;
    csvContent += `Total Records,${data.totalRecords}\n\n`;

    // Add raw events if available
    if (data.rawEvents && data.rawEvents.length > 0) {
      csvContent += 'RAW EVENTS\n';
      csvContent +=
        'ID,User ID,Event Type,Event Category,Subject Type,Subject ID,Session ID,IP Address,User Agent,Created At\n';

      data.rawEvents.forEach((event: any) => {
        csvContent += `"${event.id}","${event.userId || ''}","${event.eventType}","${event.eventCategory}","${event.subjectType || ''}","${event.subjectId || ''}","${event.sessionId || ''}","${event.ipAddress || ''}","${event.userAgent || ''}","${event.createdAt}"\n`;
      });
      csvContent += '\n';
    }

    // Add aggregated data if available
    if (data.aggregatedData) {
      csvContent += 'AGGREGATED DATA\n';

      // Event type summary
      if (data.aggregatedData.eventTypeSummary) {
        csvContent += 'Event Type Summary\n';
        csvContent += 'Event Type,Count,Percentage\n';
        data.aggregatedData.eventTypeSummary.forEach((item: any) => {
          csvContent += `"${item.eventType}",${item.count},${item.percentage}\n`;
        });
        csvContent += '\n';
      }

      // Event category summary
      if (data.aggregatedData.eventCategorySummary) {
        csvContent += 'Event Category Summary\n';
        csvContent += 'Event Category,Count,Percentage\n';
        data.aggregatedData.eventCategorySummary.forEach((item: any) => {
          csvContent += `"${item.eventCategory}",${item.count},${item.percentage}\n`;
        });
        csvContent += '\n';
      }
    }

    await writeFile(filePath, csvContent, 'utf8');
  }

  /**
   * Generate Excel file
   */
  private async generateExcelFile(data: any, filePath: string) {
    // For now, generate as CSV (would need xlsx library for proper Excel)
    await this.generateCsvFile(data, filePath);
  }

  /**
   * Generate PDF file
   */
  private async generatePdfFile(data: any, filePath: string) {
    // For now, generate as JSON (would need PDF library for proper PDF)
    await this.generateJsonFile(data, filePath);
  }

  // Helper methods for aggregated data

  private async getEventTypeSummary(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .groupBy('event.eventType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map((item) => ({
      eventType: item.eventType,
      count: parseInt(item.count),
      percentage: total > 0 ? (parseInt(item.count) / total) * 100 : 0,
    }));
  }

  private async getEventCategorySummary(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.eventCategory', 'eventCategory')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .groupBy('event.eventCategory')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map((item) => ({
      eventCategory: item.eventCategory,
      count: parseInt(item.count),
      percentage: total > 0 ? (parseInt(item.count) / total) * 100 : 0,
    }));
  }

  private async getSubjectTypeSummary(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.subjectType', 'subjectType')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.subjectType IS NOT NULL')
      .groupBy('event.subjectType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, item) => sum + parseInt(item.count), 0);

    return result.map((item) => ({
      subjectType: item.subjectType,
      count: parseInt(item.count),
      percentage: total > 0 ? (parseInt(item.count) / total) * 100 : 0,
    }));
  }

  private async getUserActivitySummary(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'uniqueUsers')
      .addSelect('COUNT(*)', 'totalEvents')
      .addSelect(
        'AVG(CASE WHEN event.userId IS NOT NULL THEN 1 ELSE 0 END)',
        'authenticatedRate',
      )
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .getRawOne();

    return {
      uniqueUsers: parseInt(result.uniqueUsers) || 0,
      totalEvents: parseInt(result.totalEvents) || 0,
      authenticatedRate: parseFloat(result.authenticatedRate) || 0,
    };
  }

  private async getTimeSeriesData(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select("DATE_TRUNC('day', event.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(DISTINCT event.userId)', 'uniqueUsers')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      date: item.date,
      count: parseInt(item.count),
      uniqueUsers: parseInt(item.uniqueUsers),
    }));
  }

  // Helper methods for charts data

  private async getDailyEventsChart(dateCondition: any) {
    return this.getTimeSeriesData(dateCondition);
  }

  private async getHourlyEventsChart(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select("DATE_TRUNC('hour', event.createdAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      hour: item.hour,
      count: parseInt(item.count),
    }));
  }

  private async getTopEventsChart(dateCondition: any) {
    return this.getEventTypeSummary(dateCondition);
  }

  private async getTopUsersChart(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.userId IS NOT NULL')
      .groupBy('event.userId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return result.map((item) => ({
      userId: item.userId,
      count: parseInt(item.count),
    }));
  }

  private async getTopContentChart(dateCondition: any) {
    const result = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('event.subjectType', 'subjectType')
      .addSelect('event.subjectId', 'subjectId')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate: dateCondition })
      .andWhere('event.subjectType IS NOT NULL')
      .andWhere('event.subjectId IS NOT NULL')
      .groupBy('event.subjectType, event.subjectId')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return result.map((item) => ({
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      count: parseInt(item.count),
    }));
  }

  private buildDateCondition(query: AnalyticsExportQueryDto) {
    if (query.fromDate && query.toDate) {
      return Between(query.fromDate, query.toDate);
    } else if (query.fromDate) {
      return MoreThan(query.fromDate);
    } else if (query.toDate) {
      return MoreThan(query.toDate);
    } else {
      // Default to last 30 days
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      return MoreThan(defaultStartDate);
    }
  }

  private async ensureExportDirectory() {
    try {
      await mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      // Directory might already exist - ignore error
      console.warn('Export directory creation failed:', error);
    }
  }
}
