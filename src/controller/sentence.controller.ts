import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import dayjs from 'dayjs';
import type { Response } from 'express';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import { SentenceDto } from 'src/dto/sentence.dto';
import { Lang } from 'src/enum/lang.enum';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { SentencePronunciationService } from 'src/service/sentence-pronunciation.service';
import { SentenceService } from 'src/service/sentence.service';

@ClientAllowed('android')
@Controller('sentences')
export class SentenceController {
  private readonly logger = new Logger(SentenceController.name);

  constructor(
    private readonly sentenceService: SentenceService,
    private readonly authService: AuthService,
    private readonly sentencePronunciationService: SentencePronunciationService,
  ) {}

  @Get('version')
  async getVersion(): Promise<
    {
      lang: Lang;
      updatedAt: string;
      totalCount: string;
    }[]
  > {
    return this.sentenceService.getVersion();
  }

  @Get()
  async getSentences(@Auth() auth: AuthDto): Promise<SentenceDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);
    const sentences = await this.sentenceService.getSentences(
      user,
      user.targetLang,
    );
    return sentences.map((item) => {
      return this.sentenceService.toSentenceDto(item, user.sourceLang, user);
    });
  }

  @Post(':id/remember')
  async remember(
    @Param('id', new RequiredParamPipe()) sentenceId: string,
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

  @Post(':id/bad-feedback')
  async bad(@Param('id', new RequiredParamPipe()) sentenceId: string) {
    await this.sentenceService.bad(sentenceId);
  }

  @Get(':id/pronunciation')
  async getPronunciation(
    @Param('id', new RequiredParamPipe()) sentenceId: string,
    @Query('slow', ParseBoolPipe) slow: boolean = false,
    @Query('lang', new RequiredParamPipe()) lang: Lang,
    @Res() res: Response,
  ) {
    const pronunciation =
      await this.sentencePronunciationService.loadRandomSpeaker(
        sentenceId,
        lang,
        slow,
      );
    const buffer = pronunciation?.pronunciation;
    if (buffer == null) {
      return null;
    }

    // 设置响应头
    res.set({
      'Content-Type': 'audio/ogg', // 或 audio/opus / audio/webm 看你的编码格式
      'Content-Disposition': `inline; filename="sentence-voice-${dayjs().unix()}.opus"`,
      'Content-Length': buffer.length,
    });

    // Buffer 输出音频 (不再使用 stream.pipe)
    return res.end(buffer);
  }
}
