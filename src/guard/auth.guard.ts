import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorator/public.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { User } from 'src/model/user.model';
import { ConfigService } from 'src/service/config.service';
import { Repository } from 'typeorm';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 公共接口跳过验证
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // 尝试从 Header 或 Query 获取 token
    const tokenFromHeader = this.extractTokenFromHeader(request);
    const tokenFromQuery = this.extractTokenFromQuery(request);
    const token = tokenFromHeader || tokenFromQuery;

    if (!token) {
      throw new UnauthorizedException('未发现令牌');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ userId: number }>(
        token,
        {
          secret: this.configService.jwtSecret,
        },
      );

      const user = await this.userRepository.findOneBy({ id: payload.userId });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 挂载用户信息到 request
      request['user'] = { userId: payload.userId } satisfies AuthDto;
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException('无效的令牌');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromQuery(request: Request): string | undefined {
    // 推荐使用 ?token=xxx 而不是 ?authorization=xxx
    const tokenBase64 = request.query['token'] as string | undefined;
    if (!tokenBase64) {
      return undefined;
    }
    return Buffer.from(tokenBase64, 'base64').toString('utf8');
  }
}
