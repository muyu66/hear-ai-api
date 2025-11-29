import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VoiceRequest } from './voice-request';
import { ConfigService } from 'src/service/config.service';

interface ResBody {
  encodedAudio?: string;
}

@Injectable()
export class VoiceMurfRequest implements VoiceRequest {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async request(
    words: string,
    speaker: string,
    slow: boolean,
  ): Promise<Buffer> {
    const body = await this.httpService.axiosRef.post<ResBody>(
      'https://api.murf.ai/v1/speech/generate',
      {
        text: words,
        voiceId: 'en-US-natalie',
        rate: slow ? -50 : 0,
        encodeAsBase64: true,
      },
      {
        headers: {
          'api-key': this.configService.murfApiKey,
          'Content-Type': 'application/json',
        },
      },
    );
    const encodedAudio = body.data?.encodedAudio;
    if (encodedAudio) {
      return Buffer.from(encodedAudio, 'base64');
    }
    throw new Error('语音合成失败');
  }
}
