import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import RPCClient from '@alicloud/pop-core';
import { firstValueFrom } from 'rxjs';
import { VoiceRequest } from './voice-request';
import { ConfigService } from 'src/service/config.service';

@Injectable()
export class VoiceAliRequest implements VoiceRequest {
  private token: string = '';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    if (this.configService.aliAk && this.configService.aliSk) {
      const client = new RPCClient({
        accessKeyId: this.configService.aliAk || '',
        accessKeySecret: this.configService.aliSk || '',
        endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
        apiVersion: '2019-02-28',
      });

      client
        .request('CreateToken', {})
        .then((result: { Token: { Id: string; ExpireTime: string } }) => {
          this.token = result.Token.Id;
        })
        .catch((e) => {
          console.log(e);
        });
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
          voice: speakerId ? speakerId : 'cally',
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
