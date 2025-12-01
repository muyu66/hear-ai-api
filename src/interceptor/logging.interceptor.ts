import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import { Observable, tap, catchError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const nanoid = customAlphabet('1234567890abcdef', 6);
    const requestId = nanoid();
    const startTime = Date.now();

    const { method, originalUrl, ip } = request;
    const body: unknown = request.body;

    const maxLength = 500;
    const safeBody =
      body && Object.keys(body).length
        ? JSON.stringify(body).slice(0, maxLength) +
          (JSON.stringify(body).length > maxLength ? '...' : '')
        : '';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const logRequest =
          `[ID:${requestId}] [Status:${response.statusCode}] ${method} ${originalUrl}` +
          (safeBody ? ` <- Body: ${safeBody}` : '') +
          ` IP: ${ip} (${duration}ms)`;
        this.logger.debug(logRequest);
      }),
      catchError((err: Error & { status?: number }) => {
        const duration = Date.now() - startTime;
        const logRequest =
          `[ID:${requestId}] [Status:${response.statusCode || err.status || 500}] ${method} ${originalUrl}` +
          (safeBody ? ` <- Body: ${safeBody}` : '') +
          ` IP: ${ip} (${duration}ms) [Error: ${err.message}]`;
        this.logger.error(logRequest, err.stack);
        throw err; // 继续抛出异常，让全局异常过滤器处理
      }),
    );
  }
}
