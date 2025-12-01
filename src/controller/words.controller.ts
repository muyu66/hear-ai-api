import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import type { Response } from 'express';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { WordsDto } from 'src/dto/words.dto';
import { AuthService } from 'src/service/auth.service';
import { WordsService } from 'src/service/words.service';
import { md5 } from 'src/tool/tool';
import { VoiceStore } from 'src/tool/voice-store';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';

@ClientAllowed('android')
@Controller('words')
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly authService: AuthService,
    private readonly voiceStore: VoiceStore,
    private readonly voiceSpeaker: VoiceSpeaker,
  ) {}

  @Get()
  async getWords(@Auth() auth: AuthDto): Promise<WordsDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);
    const words = await this.wordsService.getWords(user);
    return words.map((item) => {
      return <WordsDto>{
        id: item.id,
        words: item.source,
        translation: item.target,
        type: randomInt(1, 101) <= user.sayRatio ? 'say' : 'listen',
      };
    });
  }

  @Post(':id/remember')
  async rememberWords(
    @Param('id') wordsId: number,
    @Body() body: { hintCount: number },
    @Auth() auth: AuthDto,
  ) {
    await this.wordsService.rememberWords(wordsId, body.hintCount, auth.userId);
  }

  @Post(':id/bad')
  async badWords(@Param('id') wordsId: number) {
    await this.wordsService.badWords(wordsId);
  }

  @Get(':id/voice_stream')
  async getVoiceByWordsId(
    @Param('id') wordsId: number,
    @Query('slow', new ParseBoolPipe()) slow: boolean = false,
    @Auth() auth: AuthDto,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.getUserProfile(auth.userId);
      const speaker = user.multiSpeaker
        ? this.voiceSpeaker.getRandomName()
        : this.voiceSpeaker.getDefaultName();

      const fileName = this.voiceStore.getFileName(wordsId, speaker, slow);
      const stream = await this.voiceStore.getStream(fileName);
      if (stream == null) {
        throw new NotFoundException();
      }

      // 设置响应头
      res.set({
        'Content-Type': 'audio/ogg',
        'Content-Disposition': `inline; filename="words-voice-${md5(fileName)}.opus"`,
      });

      stream.pipe(res);
    } catch (err) {
      throw new NotFoundException(err);
    }
  }
}
