import { HttpService } from '@nestjs/axios';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { WordService } from 'src/service/word.service';
import Stream from 'stream';

@Controller()
export class WordController {
  constructor(
    private readonly httpService: HttpService,
    private readonly wordService: WordService,
  ) {}

  @Get('word/:word/dict')
  async getDict(@Param('word') word: string) {
    return this.wordService.getDict(word);
  }

  @Post('word/:word/dict/bad')
  async badDict(@Param('word') word: string) {
    return this.wordService.badDict(word);
  }

  /**
   * 获取单词的发音
   * 来自于第三方url，暂不支持慢速语音
   */
  @Get('word/:word/voice_stream')
  async getVoiceUrlThird(
    @Param('word') word: string,
    // TODO: 暂不支持
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('slow') slow: boolean = false,
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
