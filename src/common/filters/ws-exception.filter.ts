import { I18nService } from 'nestjs-i18n';
import { AuthPayload } from 'src/common/interface';
import { formatI18nResponse } from 'src/shared/helpers';

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface ExceptionResponse {
  messageKey?: string;
  messageArgs?: Record<string, unknown>;
  code?: string;
  data?: unknown;
  message?: string;
  details?: unknown;
}

interface WebSocketWithI18n extends Socket {
  user?: AuthPayload;
}

@Catch(WsException)
export class I18nWsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nWsExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: WsException, host: ArgumentsHost) {
    const wsHost = host.switchToWs();
    const client = wsHost.getClient<WebSocketWithI18n>();
    const data: { [key: string]: string } = wsHost?.getData() || {};
    const pattern = wsHost.getPattern();

    const exceptionResponse = exception.getError() as ExceptionResponse;

    // Extract error information from exception
    const messageKey = exceptionResponse?.messageKey;
    const messageArgs = exceptionResponse?.messageArgs || {};
    const lang = client.handshake.headers['accept-language'] || 'en';
    let message: string =
      exceptionResponse?.message || 'WebSocket error occurred';

    // Translate message if messageKey is provided
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

    const details = exceptionResponse?.details;

    // Build error response for WebSocket
    const errorResponse = {
      success: false,
      type: 'error',
      message: message,
      details,
      metadata: {
        messageKey,
        messageArgs,
        timestamp: new Date().toISOString(),
        pattern,
        clientId: client.id,
      },
    };

    // Add comprehensive error logging with WebSocket context
    this.logger.error(`WebSocket Exception: ${message}`, {
      // WebSocket information
      pattern,
      clientId: client.id,
      data,
      // Client information
      userAgent: client.handshake.headers['user-agent'],
      ip: client.handshake.address,
      // User context
      userId: client.user?.uid,
      userRole: client.user?.role,
      // Error details
      exceptionName: exception.constructor.name,
      exceptionMessage: exception.message,
      // Response metadata
      responseMetadata: errorResponse.metadata,
      // Additional context
      timestamp: new Date().toISOString(),
      processId: process.pid,
    });

    // Emit error event to the client
    if (client.emit) {
      client.emit('exception', errorResponse);
    }

    // Return error response for further handling if needed
    return errorResponse;
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
