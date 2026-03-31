import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { FastifyRequest } from 'fastify';
import { isAxiosError, type AxiosError } from 'axios';

/* -------------------------------------------------------------------------- */
/*  Error codes & internal payload (learner-ai upstream / DB mapping)        */
/* -------------------------------------------------------------------------- */

/** Stable machine-readable codes for clients; keep values stable across releases. */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  ORCHESTRATION_UNAVAILABLE: 'ORCHESTRATION_SERVICE_UNAVAILABLE',
  ORCHESTRATION_ERROR: 'ORCHESTRATION_SERVICE_ERROR',

  AI4BHARAT_UNAVAILABLE: 'AI4BHARAT_SERVICE_UNAVAILABLE',
  TEXT_EVAL_UNAVAILABLE: 'TEXT_EVAL_SERVICE_UNAVAILABLE',
  TEXT_EVAL_AUDIO_PROCESSING_FAILED: 'TEXT_EVAL_AUDIO_PROCESSING_FAILED',

  CONTENT_SERVICE_UNAVAILABLE: 'CONTENT_SERVICE_UNAVAILABLE',
  RECOMMENDATION_UNAVAILABLE: 'RECOMMENDATION_SERVICE_UNAVAILABLE',
  LLM_SERVICE_UNAVAILABLE: 'LLM_SERVICE_UNAVAILABLE',

  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_BAD_RESPONSE: 'UPSTREAM_BAD_RESPONSE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Carried on HttpException before GlobalExceptionFilter maps to the wire JSON. */
export interface InternalErrorPayload {
  code: ErrorCode | string;
  message: string;
  errors?: unknown[];
  upstream?: string;
  details?: unknown;
}

const includeDetails =
  process.env.NODE_ENV !== 'production' || process.env.EXPOSE_ERROR_DETAILS === 'true';

function axiosDetails(err: AxiosError): unknown {
  if (!includeDetails) {
    return undefined;
  }
  return {
    status: err.response?.status,
    data: err.response?.data,
  };
}

function axiosUserMessage(err: AxiosError): string {
  const data = err.response?.data as Record<string, unknown> | undefined;
  if (data && typeof data === 'object') {
    const m = data.message ?? data.error ?? data.detail;
    if (typeof m === 'string') {
      return m;
    }
    if (Array.isArray(m)) {
      return m.join(', ');
    }
  }
  return err.message || 'Upstream service returned an error.';
}

export function buildErrorPayload(err: unknown): {
  status: number;
  body: InternalErrorPayload;
} {
  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return {
        status: HttpStatus.GATEWAY_TIMEOUT,
        body: {
          code: ErrorCodes.UPSTREAM_TIMEOUT,
          message:
            'The upstream service did not respond in time. Please try again later.',
          upstream: 'http-client',
          details: axiosDetails(err),
        },
      };
    }
    if (!err.response) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          code: ErrorCodes.UPSTREAM_UNAVAILABLE,
          message:
            'Could not reach an external service. It may be down or unreachable.',
          upstream: 'http-client',
          details: axiosDetails(err),
        },
      };
    }
    return {
      status: HttpStatus.BAD_GATEWAY,
      body: {
        code: ErrorCodes.UPSTREAM_BAD_RESPONSE,
        message: axiosUserMessage(err),
        upstream: 'http-client',
        details: axiosDetails(err),
      },
    };
  }

  if (err instanceof Error) {
    const name = err.name;
    const msg = err.message || 'An unexpected error occurred.';

    if (
      name === 'MongoNetworkError' ||
      /MongoNetworkError|TopologyDescription|ECONNREFUSED|querySrv|ReplicaSetNoPrimary/i.test(
        msg,
      )
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          code: ErrorCodes.DATABASE_UNAVAILABLE,
          message:
            'The database is temporarily unavailable. Please try again later.',
        },
      };
    }

    if (name === 'MongoServerError' || name === 'MongoError') {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: ErrorCodes.DATABASE_ERROR,
          message: includeDetails
            ? msg
            : 'A database error occurred while processing your request.',
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: msg,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    },
  };
}

function isInternalErrorPayload(value: unknown): value is InternalErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as InternalErrorPayload).code === 'string' &&
    typeof (value as InternalErrorPayload).message === 'string'
  );
}

function statusToDefaultCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCodes.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.NOT_FOUND;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}

export function ensureAppErrorHttpException(exception: HttpException): HttpException {
  const status = exception.getStatus();
  const res = exception.getResponse();

  if (isInternalErrorPayload(res)) {
    return exception;
  }

  let message: string;
  let code = statusToDefaultCode(status);
  const extra: Partial<InternalErrorPayload> = {};

  if (typeof res === 'string') {
    message = res;
  } else if (typeof res === 'object' && res !== null) {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.message)) {
      message = o.message.map(String).join(', ');
      extra.errors = o.message;
    } else if (typeof o.message === 'string') {
      message = o.message;
    } else if (typeof o.error === 'string') {
      message = o.error;
    } else {
      message = 'Request could not be completed.';
    }
    if (typeof o.code === 'string') {
      code = o.code;
    }
  } else {
    message = 'Request could not be completed.';
  }

  const body: InternalErrorPayload = {
    code,
    message,
    ...extra,
  };

  return new HttpException(body, status);
}

export function buildHttpExceptionFromUnknown(err: unknown): HttpException {
  if (err instanceof HttpException) {
    return ensureAppErrorHttpException(err);
  }
  const { status, body } = buildErrorPayload(err);
  return new HttpException(body, status);
}

export function mapUnknownToHttpException(err: unknown): HttpException {
  return buildHttpExceptionFromUnknown(err);
}

export function mapAxiosToUpstreamHttpException(
  upstream: string,
  code: string,
  userMessage: string,
  err: unknown,
): HttpException {
  if (isAxiosError(err)) {
    const { status, body } = buildErrorPayload(err);
    return new HttpException(
      {
        ...body,
        code,
        upstream,
        message: userMessage || body.message,
      },
      status,
    );
  }
  return buildHttpExceptionFromUnknown(err);
}

/* -------------------------------------------------------------------------- */
/*  Wire JSON (same contract as all-content-service GlobalExceptionFilter)  */
/* -------------------------------------------------------------------------- */

export interface StandardApiErrorResponse {
  success: false;
  message: string;
  error_type: string;
  timestamp: string;
  request_id: string;
  errors: unknown[];
  code: string;
}

export function getOrCreateRequestId(request: FastifyRequest): string {
  const a = request.headers['x-request-id'];
  const b = request.headers['request_id'];
  const c = request.headers['x-correlation-id'];
  const raw = a ?? b ?? c;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim();
  }
  return randomUUID();
}

function nestDefaultErrorLabel(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return 'Bad Request';
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Not Found';
    case HttpStatus.BAD_GATEWAY:
      return 'Bad Gateway';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    case HttpStatus.GATEWAY_TIMEOUT:
      return 'Gateway Timeout';
    default:
      return statusCode >= 500 ? 'Internal Server Error' : 'Bad Request';
  }
}

export function buildContentStyleErrorBody(
  statusCode: number,
  exceptionResponse: string | Record<string, unknown>,
  requestId: string,
): StandardApiErrorResponse {
  let message = 'Something went wrong. Please try again later.';
  let error = 'Internal Server Error';
  let errorType = 'SystemError';
  let code = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED';
  let errors: unknown[] = [];

  if (typeof exceptionResponse === 'string') {
    message = exceptionResponse;
  } else if (
    typeof exceptionResponse === 'object' &&
    exceptionResponse !== null
  ) {
    const res = exceptionResponse as Record<string, unknown>;
    message = Array.isArray(res.message)
      ? (res.message as unknown[]).map(String).join(', ')
      : (typeof res.message === 'string' ? res.message : message) || message;

    if (typeof res.error === 'string') {
      error = res.error;
    } else {
      error = nestDefaultErrorLabel(statusCode);
    }

    errorType =
      (typeof res.error_type === 'string' ? res.error_type : null) ||
      error.replace(/\s+/g, '');
    code =
      (typeof res.code === 'string' && res.code.length > 0 ? res.code : code) ||
      code;
    errors = Array.isArray(res.errors) ? [...res.errors] : [];

    if (typeof res.upstream === 'string' && typeof message === 'string') {
      message = `${message} (service: ${res.upstream})`;
    }
    if (res.details !== undefined && errors.length === 0) {
      errors.push(res.details);
    }
  }

  const timestamp = new Date().toISOString();

  return {
    success: false,
    message,
    error_type: errorType,
    timestamp,
    request_id: requestId,
    errors,
    code,
  };
}

export function finalizeStandardError(
  httpStatus: number,
  rawPayload: string | Record<string, unknown>,
  requestId: string,
): StandardApiErrorResponse {
  return buildContentStyleErrorBody(httpStatus, rawPayload, requestId);
}

/* -------------------------------------------------------------------------- */
/*  Domain exceptions (aligned with all-content-service api.exceptions.ts)    */
/* -------------------------------------------------------------------------- */

type ValidationErrorItem = {
  field?: string;
  message: string;
  code?: string;
};

export class ValidationException extends HttpException {
  constructor(message: string, errors: ValidationErrorItem[] = []) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Validation Error',
        error_type: 'ValidationError',
        code: 'VALIDATION_FAILED',
        errors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(
      { statusCode: HttpStatus.NOT_FOUND, message, error: 'Not Found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ExternalServiceException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        error: 'External Service Error',
        error_type: 'ExternalServiceError',
        code: 'EXTERNAL_SERVICE_FAILURE',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class ExternalServiceTimeoutException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.GATEWAY_TIMEOUT,
        message,
        error: 'Timeout Error',
        error_type: 'TimeoutError',
        code: 'EXTERNAL_SERVICE_TIMEOUT',
      },
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
