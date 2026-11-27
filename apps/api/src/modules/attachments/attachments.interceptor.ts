import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { AppConfig } from '@/core/config';
import { DomainError } from '@/core/errors';

const BYTES_PER_MB = 1024 * 1024;

/**
 * Reads the single multipart field "file" into memory, with the size limit from the config
 * (so an oversized upload is cut off while it streams in). Upload problems become 422,
 * like every other validation error in the API.
 */
@Injectable()
export class AttachmentFileInterceptor implements NestInterceptor {
  private readonly delegate: NestInterceptor;
  private readonly maxBytes: number;

  constructor(config: AppConfig) {
    this.maxBytes = config.uploads.maxBytes;
    const Delegate = FileInterceptor('file', { limits: { fileSize: this.maxBytes, files: 1, fields: 5 } });
    this.delegate = new Delegate();
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.delegate.intercept(context, next);
    } catch (error) {
      if (error instanceof HttpException) {
        if (error.getStatus() === HttpStatus.PAYLOAD_TOO_LARGE) {
          throw new DomainError(
            `O arquivo passa do limite de ${Math.floor(this.maxBytes / BYTES_PER_MB)} MB`,
            'FILE_TOO_LARGE',
            422,
          );
        }
        throw new DomainError('Não foi possível ler o arquivo enviado', 'INVALID_UPLOAD', 422);
      }
      throw error;
    }
  }
}
