import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { formatI18nResponse } from 'src/shared/helpers';

interface ExceptionResponse {
  messageKey?: string;
  messageArgs?: Record<string, unknown>;
  code?: string;
  data?: unknown;
  message?: string;
}

interface RequestWithI18n extends Request {
  i18nLang?: string;
}

@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithI18n>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as ExceptionResponse;

    // Extract error information from exception
    const messageKey = exceptionResponse?.messageKey;
    const messageArgs = exceptionResponse?.messageArgs || {};
    const lang = request.i18nLang || 'en';
    let message: string = exceptionResponse?.message || 'Something went wrong';
    if (messageKey) {
      const { message: translatedMessage } = formatI18nResponse(
        this.i18n,
        lang,
        {
          messageKey,
          messageArgs,
        },
      );
      message = translatedMessage;
    }
    const code = exceptionResponse?.code;
    const data = exceptionResponse?.data || null;

    // Build error response
    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      code,
      data,
      metadata: {
        messageKey,
        messageArgs,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    response.status(status).json(errorResponse);
  }
}
