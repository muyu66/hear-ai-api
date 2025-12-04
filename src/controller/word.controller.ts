import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import dayjs from 'dayjs';
import type { Response } from 'express';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { AuthService } from 'src/service/auth.service';
import { WordService } from 'src/service/word.service';
import { VoiceStore } from 'src/tool/voice-store';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';

@ClientAllowed('android')
@Controller()
export class WordController {
  constructor(
    private readonly wordService: WordService,
    private readonly authService: AuthService,
    private readonly voiceStore: VoiceStore,
    private readonly voiceSpeaker: VoiceSpeaker,
  ) {}

  @Get('word/:word/dict')
  async getDict(@Param('word') word: string) {
    return this.wordService.getDictOrFail(word);
  }

  @Post('word/:word/dict/bad')
  async badDict(@Param('word') word: string) {
    return this.wordService.badDict(word);
  }

  /**
   * 获取单词的发音
   */
  @Get('word/:word/voice_stream')
  async getVoiceUrlThird(
    @Param('word') word: string,
    @Query('slow') slow: boolean = false,
    @Auth() auth: AuthDto,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.getUserProfile(auth.userId);
      const speaker = user.multiSpeaker
        ? this.voiceSpeaker.getRandomName('word')
        : this.voiceSpeaker.getDefaultName('word');

      const fileName = this.voiceStore.getFileName(word, speaker, 'word', slow);
      const stream = await this.voiceStore.getStream(fileName);
      if (stream == null) {
        throw new NotFoundException();
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
}
