import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildContentStyleErrorBody,
  buildHttpExceptionFromUnknown,
  ensureAppErrorHttpException,
  getOrCreateRequestId,
} from '../exceptions/api.exceptions';

/**
 * Same JSON contract as all-content-service `global-exception.filter.ts`.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const normalized =
      exception instanceof HttpException
        ? ensureAppErrorHttpException(exception)
        : buildHttpExceptionFromUnknown(exception);

    const statusCode = normalized.getStatus();
    const exceptionResponse = normalized.getResponse();

    const requestId = getOrCreateRequestId(request);

    const payload: string | Record<string, unknown> =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      !Array.isArray(exceptionResponse)
        ? (exceptionResponse as Record<string, unknown>)
        : String(exceptionResponse);

    const body = buildContentStyleErrorBody(statusCode, payload, requestId);

    let resError: string | undefined;
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      typeof (exceptionResponse as { error?: string }).error === 'string'
    ) {
      resError = (exceptionResponse as { error?: string }).error;
    }

    this.logger.error(
      JSON.stringify({
        timestamp: body.timestamp,
        method: request.method,
        path: request.url,
        request_id: requestId,
        statusCode,
        message: body.message,
        error: resError,
        error_type: body.error_type,
        code: body.code,
        errors: body.errors,
      }),
    );

    response.status(statusCode).send(body);
  }
}
