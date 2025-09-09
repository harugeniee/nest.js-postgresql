import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAccessTokenGuard } from 'src/auth/guard/jwt-access-token.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { USER_CONSTANTS } from 'src/shared/constants/user.constants';
import {
  MailOptions,
  MailSendResult,
  MailSendBatchResult,
  MailMetrics,
} from './mail.interface';

@Controller('mail')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMail(@Body() options: MailOptions): Promise<MailSendResult> {
    return this.mailService.sendMail(options);
  }

  @Post('send-batch')
  @HttpCode(HttpStatus.OK)
  async sendMailBatch(
    @Body()
    body: {
      options: Omit<MailOptions, 'to'>;
      recipients: Array<{ name?: string; email: string }>;
    },
  ): Promise<MailSendBatchResult> {
    return this.mailService.sendMailBatch(body.options, body.recipients);
  }

  @Post('send-template')
  @HttpCode(HttpStatus.OK)
  async sendTemplateMail(
    @Body()
    body: {
      templateName: string;
      recipients:
        | Array<{ name?: string; email: string }>
        | { name?: string; email: string };
      templateData?: Record<string, unknown>;
      options?: Partial<MailOptions>;
    },
  ): Promise<MailSendResult> {
    return this.mailService.sendTemplateMail(
      body.templateName,
      body.recipients,
      body.templateData,
      body.options,
    );
  }

  @Get('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const success = await this.mailService.testConnection();
    return {
      success,
      message: success
        ? 'Mail connection is working'
        : 'Mail connection failed',
    };
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getMetrics(): Promise<MailMetrics> {
    return this.mailService.getMetrics();
  }

  @Post('reset-metrics')
  @HttpCode(HttpStatus.OK)
  @Roles(USER_CONSTANTS.ROLES.ADMIN)
  async resetMetrics(): Promise<{ success: boolean; message: string }> {
    this.mailService.resetMetrics();
    return {
      success: true,
      message: 'Mail metrics reset successfully',
    };
  }

  @Post('test-welcome')
  @HttpCode(HttpStatus.OK)
  async sendTestWelcomeEmail(
    @Body() body: { email: string; name: string; username: string },
  ): Promise<MailSendResult> {
    return this.mailService.sendTemplateMail(
      'welcome',
      { email: body.email, name: body.name },
      {
        name: body.name,
        email: body.email,
        username: body.username,
        accountType: 'Free',
        verificationLink: 'https://example.com/verify?token=test-token',
      },
    );
  }

  @Post('test-password-reset')
  @HttpCode(HttpStatus.OK)
  async sendTestPasswordResetEmail(
    @Body() body: { email: string; name: string },
  ): Promise<MailSendResult> {
    return this.mailService.sendTemplateMail(
      'password-reset',
      { email: body.email, name: body.name },
      {
        name: body.name,
        email: body.email,
        resetLink: 'https://example.com/reset-password?token=test-token',
        expirationTime: 24,
      },
    );
  }

  @Post('test-notification')
  @HttpCode(HttpStatus.OK)
  async sendTestNotificationEmail(
    @Body()
    body: {
      email: string;
      name: string;
      notificationTitle: string;
      notificationMessage: string;
    },
  ): Promise<MailSendResult> {
    return this.mailService.sendTemplateMail(
      'notification',
      { email: body.email, name: body.name },
      {
        name: body.name,
        email: body.email,
        notificationTitle: body.notificationTitle,
        notificationMessage: body.notificationMessage,
        actionRequired: true,
        actionDescription: 'Please review the notification details',
        actionLink: 'https://example.com/notifications',
        actionButtonText: 'View Details',
        additionalInfo: [
          { label: 'Priority', value: 'High' },
          { label: 'Category', value: 'System Notification' },
          { label: 'Timestamp', value: new Date().toISOString() },
        ],
      },
    );
  }
}
