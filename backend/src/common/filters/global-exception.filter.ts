import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiError } from '../exceptions/api-error.exception';

/**
 * Global exception filter that converts all exceptions into
 * the standard response envelope defined in Spec 02:
 *
 * { success: false, error: { code, message, details? } }
 *
 * Handles:
 * - ApiError (our custom business errors)
 * - HttpException (NestJS built-in errors from guards, pipes, etc.)
 * - Unknown errors (caught as 500 INTERNAL_ERROR)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof ApiError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.description;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'object' && exResponse !== null) {
        const resp = exResponse as Record<string, unknown>;
        code = (resp['error'] as string) || 'HTTP_ERROR';
        message = Array.isArray(resp['message'])
          ? (resp['message'] as string[]).join('; ')
          : (resp['message'] as string) || exception.message;
        details = resp['details'] as Record<string, unknown> | undefined;
      } else {
        code = 'HTTP_ERROR';
        message = typeof exResponse === 'string' ? exResponse : exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      this.logger.error('Unhandled exception', exception);
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }
}
