import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { CacheService } from '../cache/cache.service';
import {
  MailOptions,
  MailSendResult,
  MailSendBatchResult,
  MailValidationResult,
  MailMetrics,
  MailAddress,
} from './mail.interface';
import { mailConfig, mailValidationConfig } from './mail.config';
import * as templates from './templates';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private transporter: any = null;
  private readonly config: ReturnType<typeof mailConfig>;
  private readonly validationConfig = mailValidationConfig;
  private readonly templateRegistry: Map<string, (...args: any[]) => string> =
    new Map();
  private metrics: MailMetrics = {
    totalSent: 0,
    totalFailed: 0,
    successRate: 0,
    averageResponseTime: 0,
  };

  constructor(private readonly cacheService: CacheService) {
    this.config = mailConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeTransporter();
    await this.loadTemplates();
    this.logger.log('✅ Mail service initialized successfully');
  }

  async onModuleDestroy(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this.transporter && typeof this.transporter.close === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.transporter.close();
      this.logger.log('🔴 Mail transporter closed');
    }
  }

  /**
   * Initialize nodemailer transporter
   */
  private async initializeTransporter(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        pool: this.config.pool,
        maxConnections: this.config.maxConnections,
        maxMessages: this.config.maxMessages,
        rateDelta: this.config.rateDelta,
        rateLimit: this.config.rateLimit,
        tls: this.config.tls,
        connectionTimeout: this.config.connectionTimeout,
        greetingTimeout: this.config.greetingTimeout,
        socketTimeout: this.config.socketTimeout,
      });

      // Verify connection
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (this.transporter && typeof this.transporter.verify === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.transporter.verify();
        this.logger.log('✅ Mail transporter verified successfully');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize mail transporter:', error);
      throw error;
    }
  }

  /**
   * Load email templates from TypeScript functions
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Register all available templates
      const templateFunctions = {
        welcome: templates.welcomeTemplate,
        'password-reset': templates.passwordResetTemplate,
        notification: templates.notificationTemplate,
        'otp-login': templates.otpLoginTemplate,
      };

      for (const [templateName, templateFunction] of Object.entries(
        templateFunctions,
      )) {
        // Store template function in registry
        this.templateRegistry.set(templateName, templateFunction);

        // Also store in cache for quick access
        await this.cacheService.set(
          `mail:template:${templateName}`,
          templateFunction,
          3600, // 1 hour
        );

        this.logger.debug(`📧 Loaded template: ${templateName}`);
      }

      this.logger.log(
        `✅ Loaded ${Object.keys(templateFunctions).length} email templates`,
      );
    } catch (error) {
      this.logger.warn('⚠️ Failed to load email templates:', error);
    }
  }

  /**
   * Send email with validation and error handling
   */
  async sendMail(options: MailOptions): Promise<MailSendResult> {
    const startTime = Date.now();

    try {
      // Validate mail options
      const validation = this.validateMailOptions(options);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(options.to);
      if (!rateLimitCheck.allowed) {
        // Calculate remaining seconds until reset
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingSeconds = Math.max(
          0,
          rateLimitCheck.resetTime - currentTime,
        );

        return {
          success: false,
          error: `Rate limit exceeded. Try again in ${remainingSeconds} seconds`,
        };
      }

      // Process template if specified
      if (options.template) {
        const processedContent = await this.processTemplate(
          options.template,
          options.templateData || {},
        );
        options.html = processedContent.html;
        options.text = processedContent.text;
        options.subject = processedContent.subject;
      }

      // Send email
      if (
        !this.transporter ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof this.transporter.sendMail !== 'function'
      ) {
        throw new Error('Mail transporter not initialized');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const info = await this.transporter.sendMail({
        from: options.from || this.config.from,
        to: this.formatRecipients(options.to),
        cc: options.cc ? this.formatRecipients(options.cc) : undefined,
        bcc: options.bcc ? this.formatRecipients(options.bcc) : undefined,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        headers: options.headers,
        priority: options.priority,
        encoding: options.encoding,
        messageId: options.messageId,
        inReplyTo: options.inReplyTo,
        references: options.references,
      });

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);

      // Log success
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const messageId = info?.messageId || 'unknown';
      this.logger.log(`📧 Email sent successfully: ${messageId}`);

      return {
        success: true,
        messageId: messageId as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response: (info?.response as string) || 'unknown',
      };
    } catch (error) {
      // Update metrics
      this.updateMetrics(false, Date.now() - startTime);

      // Log error
      this.logger.error('❌ Failed to send email:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email to multiple recipients
   */
  async sendMailBatch(
    options: Omit<MailOptions, 'to'>,
    recipients: MailAddress[],
  ): Promise<MailSendBatchResult> {
    const results: MailSendResult[] = [];
    const errors: string[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    try {
      const batchSize = 10;
      const batches = this.chunkArray(recipients, batchSize);

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch, options);
        results.push(...batchResult.results);
        errors.push(...batchResult.errors);
        totalSent += batchResult.totalSent;
        totalFailed += batchResult.totalFailed;

        // Add delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(1000);
        }
      }

      return {
        success: totalSent > 0,
        totalSent,
        totalFailed,
        results,
        errors,
      };
    } catch (error) {
      this.logger.error('❌ Failed to send batch emails:', error);
      return {
        success: false,
        totalSent,
        totalFailed: totalFailed + recipients.length,
        results,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };
    }
  }

  /**
   * Process a batch of recipients
   */
  private async processBatch(
    batch: MailAddress[],
    options: Omit<MailOptions, 'to'>,
  ): Promise<{
    results: MailSendResult[];
    errors: string[];
    totalSent: number;
    totalFailed: number;
  }> {
    const results: MailSendResult[] = [];
    const errors: string[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    const batchPromises = batch.map(async (recipient) => {
      const mailOptions: MailOptions = {
        ...options,
        to: recipient,
      };
      return this.sendMail(mailOptions);
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          totalSent++;
        } else {
          totalFailed++;
          if (result.value.error) {
            errors.push(result.value.error);
          }
        }
      } else {
        totalFailed++;
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';
        errors.push(errorMessage);
        results.push({
          success: false,
          error: errorMessage,
        });
      }
    });

    return { results, errors, totalSent, totalFailed };
  }

  /**
   * Add delay between operations
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send email using template
   */
  async sendTemplateMail(
    templateName: string,
    recipients: MailAddress | MailAddress[],
    templateData: Record<string, unknown> = {},
    options: Partial<MailOptions> = {},
  ): Promise<MailSendResult> {
    try {
      // Check if template exists in registry
      const template = this.templateRegistry.get(templateName);

      if (!template) {
        return {
          success: false,
          error: `Template '${templateName}' not found`,
        };
      }

      // Merge template data with default variables
      const mergedData = {
        appName: process.env.APP_NAME || 'NestJS App',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        supportEmail: process.env.MAIL_SUPPORT || process.env.MAIL_FROM,
        companyName: process.env.COMPANY_NAME || 'Your Company',
        companyAddress: process.env.COMPANY_ADDRESS || 'Your Address',
        ...templateData,
      };

      // Process template
      const processedContent = await this.processTemplate(
        templateName,
        mergedData,
      );

      // Send email
      return this.sendMail({
        ...options,
        to: recipients,
        subject: processedContent.subject,
        html: processedContent.html,
        text: processedContent.text,
        template: templateName,
        templateData: mergedData,
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to send template email '${templateName}':`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process email template
   */
  private async processTemplate(
    templateName: string,
    data: Record<string, unknown>,
  ): Promise<{ subject: string; html: string; text?: string }> {
    try {
      // Get template function from registry or cache
      let templateFunction = this.templateRegistry.get(templateName);

      templateFunction ??=
        (await this.cacheService.get<(...args: any[]) => string>(
          `mail:template:${templateName}`,
        )) ?? undefined;

      if (!templateFunction) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Execute template function with data
      const compiled = templateFunction(data);

      // Extract subject and content
      const subjectMatch = /<title[^>]*>(.*?)<\/title>/i.exec(compiled);
      const subject = subjectMatch ? subjectMatch[1] : 'No Subject';

      // Remove title tag from HTML content
      const html = compiled.replace(/<title[^>]*>.*?<\/title>/gi, '');

      // Generate text version (basic HTML to text conversion)
      const text = this.htmlToText(html);

      return { subject, html, text };
    } catch (error) {
      this.logger.error(
        `❌ Failed to process template '${templateName}':`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validate mail options
   */
  private validateMailOptions(options: MailOptions): MailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateRecipients(options.to, errors);
    this.validateSubject(options.subject, errors);
    this.validateContent(options, errors);
    this.validateAttachments(options.attachments, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate recipients
   */
  private validateRecipients(recipients: unknown, errors: string[]): void {
    if (!recipients) {
      errors.push('Recipients are required');
      return;
    }

    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    for (const recipient of recipientList) {
      const email =
        typeof recipient === 'string'
          ? recipient
          : (recipient as MailAddress).email;
      if (!this.validationConfig.emailRegex.test(email)) {
        errors.push(`Invalid email address: ${email}`);
      }
    }
  }

  /**
   * Validate subject
   */
  private validateSubject(subject: string, errors: string[]): void {
    if (!subject) {
      errors.push('Subject is required');
    } else if (subject.length > this.validationConfig.maxSubjectLength) {
      errors.push(
        `Subject too long (max ${this.validationConfig.maxSubjectLength} characters)`,
      );
    }
  }

  /**
   * Validate content
   */
  private validateContent(options: MailOptions, errors: string[]): void {
    if (!options.text && !options.html && !options.template) {
      errors.push('Email content is required (text, html, or template)');
    }
  }

  /**
   * Validate attachments
   */
  private validateAttachments(attachments: unknown, warnings: string[]): void {
    if (!attachments || !Array.isArray(attachments)) {
      return;
    }

    for (const attachment of attachments) {
      const attachmentObj = attachment as { contentType?: string };
      if (
        attachmentObj.contentType &&
        !this.validationConfig.allowedAttachmentTypes.includes(
          attachmentObj.contentType,
        )
      ) {
        warnings.push(
          `Attachment type '${attachmentObj.contentType}' may not be supported`,
        );
      }
    }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(
    recipients: MailAddress | MailAddress[] | string,
  ): Promise<{
    allowed: boolean;
    resetTime: number;
  }> {
    try {
      const recipientEmails = Array.isArray(recipients)
        ? recipients.map((r) => (typeof r === 'string' ? r : r.email))
        : [typeof recipients === 'string' ? recipients : recipients.email];

      const rateLimitKey = `mail:rate_limit:${recipientEmails[0]}`;
      const limit = 10; // 10 emails per hour
      const window = 3600; // 1 hour in seconds

      const result = await this.cacheService.atomicIncrementWithLimit(
        rateLimitKey,
        limit,
        window,
      );

      return {
        allowed: result.remaining > 0,
        resetTime: result.resetTime,
      };
    } catch (error) {
      this.logger.error('❌ Failed to check rate limit:', error);
      return { allowed: true, resetTime: 0 };
    }
  }

  /**
   * Format recipients for nodemailer
   */
  private formatRecipients(
    recipients: MailAddress | MailAddress[] | string,
  ): string | string[] {
    if (typeof recipients === 'string') {
      return recipients;
    }

    if (Array.isArray(recipients)) {
      return recipients.map((r) =>
        r.name ? `${r.name} <${r.email}>` : r.email,
      );
    }

    return recipients.name
      ? `${recipients.name} <${recipients.email}>`
      : recipients.email;
  }

  /**
   * Convert HTML to text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Update mail metrics
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.totalSent++;
    } else {
      this.metrics.totalFailed++;
    }

    this.metrics.successRate =
      this.metrics.totalSent /
      (this.metrics.totalSent + this.metrics.totalFailed);
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime *
        (this.metrics.totalSent + this.metrics.totalFailed - 1) +
        responseTime) /
      (this.metrics.totalSent + this.metrics.totalFailed);

    if (success) {
      this.metrics.lastSent = new Date();
    } else {
      this.metrics.lastFailed = new Date();
    }
  }

  /**
   * Get mail metrics
   */
  getMetrics(): MailMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset mail metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Test mail configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!this.transporter || typeof this.transporter.verify !== 'function') {
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('❌ Mail connection test failed:', error);
      return false;
    }
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ==================== QUEUE-BASED EMAIL METHODS ====================

  /**
   * Send single email via queue (asynchronous)
   * @param mailOptions - Mail options
   * @param _priority - Job priority (1-10)
   * @param _delay - Delay in milliseconds before processing
   * @returns Job ID for tracking
   */
  async sendMailQueue(
    mailOptions: MailOptions,
    _priority: number = 5,
    _delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    // This method would be implemented by injecting MailQueueService
    // For now, we'll throw an error to indicate it needs to be implemented
    throw new Error(
      'Queue-based email sending requires MailQueueService injection',
    );
  }

  /**
   * Send batch email via queue (asynchronous)
   * @param mailOptions - Mail options (without recipients)
   * @param recipients - List of recipients
   * @param _priority - Job priority (1-10)
   * @param _delay - Delay in milliseconds before processing
   * @returns Job ID for tracking
   */
  async sendMailBatchQueue(
    mailOptions: Omit<MailOptions, 'to'>,
    recipients: MailAddress[],
    _priority: number = 5,
    _delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    // This method would be implemented by injecting MailQueueService
    throw new Error(
      'Queue-based batch email sending requires MailQueueService injection',
    );
  }

  /**
   * Send template email via queue (asynchronous)
   * @param templateName - Template name
   * @param recipients - Recipients
   * @param _templateData - Template data
   * @param _options - Additional mail options
   * @param _priority - Job priority (1-10)
   * @param _delay - Delay in milliseconds before processing
   * @returns Job ID for tracking
   */
  async sendTemplateMailQueue(
    templateName: string,
    recipients: MailAddress | MailAddress[],
    _templateData: Record<string, unknown> = {},
    _options: Partial<MailOptions> = {},
    _priority: number = 5,
    _delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    // This method would be implemented by injecting MailQueueService
    throw new Error(
      'Queue-based template email sending requires MailQueueService injection',
    );
  }

  /**
   * Send OTP email via queue (asynchronous)
   * @param email - Recipient email
   * @param otpCode - OTP code
   * @param requestId - Request ID
   * @param _templateData - Additional template data
   * @param _priority - Job priority (1-10)
   * @param _delay - Delay in milliseconds before processing
   * @returns Job ID for tracking
   */
  async sendOtpEmailQueue(
    email: string,
    otpCode: string,
    requestId: string,
    _templateData: Record<string, unknown> = {},
    _priority: number = 8, // Higher priority for OTP emails
    _delay?: number,
  ): Promise<{ jobId: string; message: string }> {
    // This method would be implemented by injecting MailQueueService
    throw new Error(
      'Queue-based OTP email sending requires MailQueueService injection',
    );
  }
}
