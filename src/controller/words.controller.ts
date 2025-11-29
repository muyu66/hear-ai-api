import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from 'src/decorator/auth.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { WordsDto } from 'src/dto/words.dto';
import { AuthService } from 'src/service/auth.service';
import { WordsService } from 'src/service/words.service';
import { BloomFilterService } from 'src/tool/bloom-filter';
import { md5 } from 'src/tool/tool';
import { VoiceStore } from 'src/tool/voice-store';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';

@Controller('words')
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly authService: AuthService,
    private readonly bloomFilterService: BloomFilterService,
    private readonly voiceStore: VoiceStore,
    private readonly voiceSpeaker: VoiceSpeaker,
  ) {}

  @Get()
  async getWords(
    @Query('after', new ParseIntPipe()) after: number = 0,
    @Auth() auth: AuthDto,
  ): Promise<WordsDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);
    const words = await this.wordsService.getWords(user, after);
    return words.map((item) => {
      return <WordsDto>{
        id: item.id,
        words: item.source,
        translation: item.target,
      };
    });
  }

  @Post(':id/remember')
  rememberWords(@Param('id') wordsId: number, @Auth() auth: AuthDto) {
    this.bloomFilterService.markRead(auth.userId + '', wordsId + '');
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
