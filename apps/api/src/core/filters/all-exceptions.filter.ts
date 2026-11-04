import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from '@clickunicap/shared';
import { DomainError } from '@/core/errors';

/** Converte qualquer erro no formato padrão { statusCode, error, message, details? }. */
export function toErrorBody(exception: unknown): ApiErrorBody {
  if (exception instanceof DomainError) {
    return {
      statusCode: exception.statusCode,
      error: exception.code,
      message: exception.message,
      ...(exception.details !== undefined && { details: exception.details }),
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const res = exception.getResponse();
    const message =
      typeof res === 'string' ? res : String((res as { message?: unknown }).message ?? exception.message);
    return { statusCode: status, error: httpCode(status), message };
  }

  // Erro inesperado: nunca vaza detalhes para o cliente (eles vão só para o log).
  return { statusCode: 500, error: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' };
}

function httpCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
  };
  return map[status] ?? HttpStatus[status] ?? 'ERROR';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
