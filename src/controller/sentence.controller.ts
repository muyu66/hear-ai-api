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
import type { Response } from 'express';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { SentenceDto } from 'src/dto/sentence.dto';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { SentenceService } from 'src/service/sentence.service';
import { md5, randomAB } from 'src/tool/tool';
import { VoiceStore } from 'src/tool/voice-store';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';

@ClientAllowed('android')
@Controller('sentences')
export class SentenceController {
  constructor(
    private readonly sentenceService: SentenceService,
    private readonly authService: AuthService,
    private readonly voiceStore: VoiceStore,
    private readonly voiceSpeaker: VoiceSpeaker,
  ) {}

  @Get()
  async getSentences(@Auth() auth: AuthDto): Promise<SentenceDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);
    const sentences = await this.sentenceService.getSentences(user);
    return sentences.map((item) => {
      return <SentenceDto>{
        id: item.id,
        words: item.source,
        translation: item.target,
        type: randomAB('listen', 'say', user.sayRatio),
      };
    });
  }

  @Post(':id/remember')
  async rememberWords(
    @Param('id', new RequiredParamPipe()) sentenceId: number,
    @Body() body: { hintCount: number; thinkingTime: number },
    @Auth() auth: AuthDto,
  ) {
    await this.sentenceService.remember(
      sentenceId,
      body.hintCount,
      body.thinkingTime,
      auth.userId,
    );
  }

  @Post(':id/bad')
  async badWords(@Param('id', new RequiredParamPipe()) sentenceId: number) {
    await this.sentenceService.bad(sentenceId);
  }

  @Get(':id/pronunciation')
  async getPronunciation(
    @Param('id', new RequiredParamPipe()) sentenceId: number,
    @Query('slow', new ParseBoolPipe()) slow: boolean = false,
    @Auth() auth: AuthDto,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.getUserProfile(auth.userId);
      const speaker = user.multiSpeaker
        ? this.voiceSpeaker.getRandomName('words')
        : this.voiceSpeaker.getDefaultName('words');

      const fileName = this.voiceStore.getFileName(
        sentenceId,
        speaker,
        'words',
        slow,
      );
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
