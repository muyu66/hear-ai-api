import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private configService: NestConfigService) {
    this.logger.log('正在使用配置文件: ' + configService.get('NODE_ENV'));
  }

  get env(): string {
    return this.configService.get('NODE_ENV') || 'development';
  }

  get port(): number {
    return this.configService.get('PORT') || 3000;
  }

  get aliAk(): string | undefined {
    return this.configService.get('ALI_AK');
  }

  get aliSk(): string | undefined {
    return this.configService.get('ALI_SK');
  }

  get voiceAliAppKey(): string | undefined {
    return this.configService.get('VOICE_ALI_APP_KEY');
  }

  get jwtSecret(): string | undefined {
    return this.configService.get('JWT_SECRET');
  }

  get wxAppId(): string | undefined {
    return this.configService.get('WX_APP_ID');
  }

  get wxSecret(): string | undefined {
    return this.configService.get('WX_SECRET');
  }

  get murfApiKey(): string | undefined {
    return this.configService.get('MURF_API_KEY');
  }

  get deepseekApiKey(): string | undefined {
    return this.configService.get('DEEPSEEK_API_KEY');
  }

  get mysqlHost(): string | undefined {
    return this.configService.get('MYSQL_HOST');
  }

  get mysqlPort(): number {
    const port = this.configService.get('MYSQL_PORT') as string;
    return port ? parseInt(port) : 3306;
  }

  get mysqlUsername(): string | undefined {
    return this.configService.get('MYSQL_USERNAME');
  }

  get mysqlPassword(): string | undefined {
    return this.configService.get('MYSQL_PASSWORD');
  }

  get mysqlDatabase(): string | undefined {
    return this.configService.get('MYSQL_DATABASE');
  }
}
