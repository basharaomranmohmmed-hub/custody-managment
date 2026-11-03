import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { AppException } from '../exceptions/app.exception.js';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: string[];
}

interface ClientHttpError {
  statusCode: number;
  message: string;
  expose?: boolean;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const known = describeKnownException(exception);
    if (!known) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : exception,
      );
    }
    const body = known ?? internalServerError();
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }
}

export function toErrorResponse(exception: unknown): ErrorResponse {
  return describeKnownException(exception) ?? internalServerError();
}

function describeKnownException(exception: unknown): ErrorResponse | null {
  if (exception instanceof AppException) {
    return error(exception.getStatus(), exception.errorCode, exception.message);
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const message =
      typeof response === 'object' && 'message' in response
        ? response.message
        : exception.message;

    if (Array.isArray(message)) {
      return {
        ...error(status, 'VALIDATION_FAILED', 'البيانات المدخلة غير صالحة'),
        errors: message.map(String),
      };
    }
    return error(status, statusCodeName(status), String(message));
  }

  if (
    exception instanceof Prisma.PrismaClientKnownRequestError &&
    exception.code === 'P2002'
  ) {
    return error(
      HttpStatus.CONFLICT,
      'UNIQUE_CONSTRAINT_VIOLATION',
      'يوجد سجل آخر بنفس القيمة',
    );
  }

  if (isClientHttpError(exception)) {
    const message = exception.expose ? exception.message : 'طلب غير صالح';
    return error(
      exception.statusCode,
      statusCodeName(exception.statusCode),
      message,
    );
  }

  return null;
}

function internalServerError(): ErrorResponse {
  return error(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
    'حدث خطأ في الخادم',
  );
}

function error(
  statusCode: number,
  errorCode: string,
  message: string,
): ErrorResponse {
  return { success: false, statusCode, errorCode, message };
}

function statusCodeName(status: number): string {
  return HttpStatus[status] ?? 'HTTP_ERROR';
}

function isClientHttpError(exception: unknown): exception is ClientHttpError {
  if (typeof exception !== 'object' || exception === null) return false;
  const { statusCode, message } = exception as Partial<ClientHttpError>;
  return (
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500 &&
    typeof message === 'string'
  );
}
