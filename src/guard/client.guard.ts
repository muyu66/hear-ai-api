import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLIENT_ALLOWED_KEY } from 'src/decorator/client-allowed.decorator';
import { Request } from 'express';
import { AuthDto } from 'src/dto/auth.dto';

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedClients = this.reflector.get<string[]>(
      CLIENT_ALLOWED_KEY,
      context.getHandler(),
    );
    if (!allowedClients) return true; // 如果没设置，默认允许

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthDto }>();
    const user = request.user;

    if (!user || !user.clientType) return false;

    if (allowedClients.includes(user.clientType)) {
      return true;
    }

    throw new ForbiddenException('客户端无权限访问');
  }
}
