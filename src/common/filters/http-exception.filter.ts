import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { formatI18nResponse } from 'src/shared/helpers';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

import { AuthPayload } from '../interface';

interface ExceptionResponse {
  messageKey?: string;
  messageArgs?: Record<string, unknown>;
  code?: string;
  data?: unknown;
  message?: string;
}

interface RequestWithI18n extends Request {
  i18nLang?: string;
  user?: AuthPayload;
}

@Catch(HttpException)
export class I18nHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nHttpExceptionFilter.name);

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

    const detail = exceptionResponse?.message;

    // Build error response
    const errorResponse = {
      success: false,
      status: status,
      message: message,
      detail,
      metadata: {
        messageKey,
        messageArgs,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    // Add comprehensive error logging with detailed context
    this.logger.error(`HTTP Exception: ${status} - ${message}`, {
      // Request information
      path: request.url,
      method: request.method,
      query: request.query,
      params: request.params,
      body: request.body as unknown,
      // Client information
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      referer: request.headers.referer,
      // User context
      userId: request.user?.uid,
      userRole: request.user?.role,
      // Error details
      // exceptionName: exception.constructor.name,
      // exceptionMessage: exception.message,
      // Format stack trace for better readability
      // exceptionStack: this.formatStackTrace(exception.stack),
      // Response metadata
      responseMetadata: errorResponse.metadata,
      // Additional context
      timestamp: new Date().toISOString(),
      processId: process.pid,
    });

    response.status(status).json(errorResponse);
  }

  /**
   * Format stack trace for better readability and logging
   * @param stack - Raw stack trace string
   * @returns Formatted stack trace object
   */
  private formatStackTrace(stack?: string): Record<string, unknown> {
    if (!stack) {
      return { raw: 'No stack trace available' };
    }

    try {
      // Split stack trace into lines
      const lines = stack.split('\n').filter((line) => line.trim());

      // Extract main error line
      const mainError = lines[0];

      // Extract stack frames (skip the first line which is the error message)
      const stackFrames = lines.slice(1).map((line, index) => {
        const trimmed = line.trim();
        // Parse stack frame for better structure
        const frameMatch = /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/.exec(trimmed);
        if (frameMatch) {
          return {
            index: index + 1,
            function: frameMatch[1],
            file: frameMatch[2],
            line: parseInt(frameMatch[3], 10),
            column: parseInt(frameMatch[4], 10),
            raw: trimmed,
          };
        }
        // Handle async/await patterns
        const asyncMatch = /at\s+(.+?)\s+\((.+?)\)/.exec(trimmed);
        if (asyncMatch) {
          return {
            index: index + 1,
            function: asyncMatch[1],
            context: asyncMatch[2],
            raw: trimmed,
          };
        }
        // Return raw line if no pattern matches
        return {
          index: index + 1,
          raw: trimmed,
        };
      });

      return {
        mainError,
        totalFrames: stackFrames.length,
        frames: stackFrames,
        // Also keep raw for debugging
        raw: stack,
      };
    } catch (error) {
      // Fallback to raw stack if parsing fails
      this.logger.error('Failed to parse stack trace', {
        error: error as Error,
        stack,
      });
      return {
        raw: stack,
        parseError: 'Failed to parse stack trace',
      };
    }
  }
}
