import { HttpService } from '@nestjs/axios';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  Query,
  Res,
} from '@nestjs/common';
import dayjs from 'dayjs';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { VoiceStore } from 'src/tool/voice-store';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';
import Stream from 'stream';

@ClientAllowed('android')
@Controller('words')
export class WordController {
  constructor(
    private readonly authService: AuthService,
    private readonly voiceStore: VoiceStore,
    private readonly voiceSpeaker: VoiceSpeaker,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 获取单词的发音
   */
  @Get(':word/pronunciation')
  async getPronunciation(
    @Param('word', new RequiredParamPipe()) word: string,
    @Query('slow', ParseBoolPipe) slow: boolean = false,
    @Auth() auth: AuthDto,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.getUserProfile(auth.userId);
      const speaker = user.multiSpeaker
        ? this.voiceSpeaker.getRandomName('word')
        : this.voiceSpeaker.getDefaultName('word');

      const fileName = this.voiceStore.getFileName(word, speaker, 'word', slow);

      const exist = await this.voiceStore.exist(fileName);
      if (!exist) {
        // 回滚第三方音源
        return this.getPronunciationByYoudao(word, res);
      }

      const stream = await this.voiceStore.getStream(fileName);
      if (stream == null) {
        // 回滚第三方音源
        return this.getPronunciationByYoudao(word, res);
      }

      // 设置响应头
      res.set({
        'Content-Type': 'audio/ogg',
        'Content-Disposition': `inline; filename="word-voice-${dayjs().unix()}.opus"`,
      });

      stream.pipe(res);
    } catch (err) {
      throw new NotFoundException(err);
    }
  }

  private async getPronunciationByYoudao(
    @Param('word') word: string,
    @Res() res: Response,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://dict.youdao.com/dictvoice?audio=${word}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
          },
          responseType: 'stream',
        }),
      );

      // 设置响应头
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `inline; filename="word-voice-${word}.mp3"`,
        'Content-Length': response.headers['content-length'] as string,
      });
      // 管道转发
      (response.data as Stream.Readable).pipe(res);
    } catch (err) {
      throw new NotFoundException(err);
    }
  }
}
