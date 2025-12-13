import RPCClient from '@alicloud/pop-core';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from 'src/service/config.service';
import { VoiceRequest } from './voice-request';

@Injectable()
export class VoiceAliRequest implements VoiceRequest {
  private readonly logger = new Logger(VoiceAliRequest.name);
  private token: string = '';
  private client: RPCClient | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    if (this.configService.aliAk && this.configService.aliSk) {
      this.client = new RPCClient({
        accessKeyId: this.configService.aliAk || '',
        accessKeySecret: this.configService.aliSk || '',
        endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
        apiVersion: '2019-02-28',
      });
    }
  }

  async onModuleInit() {
    if (this.client != null) {
      try {
        const result: { Token: { Id: string; ExpireTime: string } } =
          await this.client.request('CreateToken', {});
        this.token = result.Token.Id;
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  async request(
    words: string,
    speakerId: string,
    slow: boolean,
  ): Promise<Buffer> {
    const res = await firstValueFrom(
      this.httpService.post(
        'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts',
        {
          appkey: this.configService.voiceAliAppKey,
          text: words,
          format: 'wav',
          sample_rate: 16000,
          voice: speakerId,
          speech_rate: slow ? -500 : 0,
        },
        {
          headers: {
            'X-NLS-Token': this.token,
          },
          responseType: 'arraybuffer',
        },
      ),
    );
    const data = Buffer.from(res.data);
    if (!data) {
      throw new Error('语音合成失败');
    }
    return data;
  }
}
