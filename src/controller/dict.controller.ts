import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
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
import { Lang } from 'src/enum/lang.enum';
import { DictModel } from 'src/interface/dict-model';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { DictPronunciationService } from 'src/service/dict-pronunciation.service';
import { DictService } from 'src/service/dict.service';

@ClientAllowed('android')
@Controller('dicts')
export class DictController {
  private readonly logger = new Logger(DictController.name);

  constructor(
    private readonly dictService: DictService,
    private readonly authService: AuthService,
    private readonly dictPronunciationService: DictPronunciationService,
  ) {}

  /**
   * 给这个词典里的单词打差评
   * @param word
   * @returns
   */
  @Post('bad-feedback')
  async bad(@Body() body: { id: string }) {
    return this.dictService.badDict(body.id);
  }

  /**
   * 根据单词，获取词典的内容
   * @param word
   * @returns
   */
  @Get(':word')
  async getDict(
    @Param('word', new RequiredParamPipe()) word: string,
    @Query('lang', new RequiredParamPipe()) lang: Lang,
    @Auth() auth: AuthDto,
  ): Promise<DictModel> {
    const user = await this.authService.getUserProfile(auth.userId);
    const data = await this.dictService.getDictsByWord(
      word,
      user.sourceLang,
      lang,
    );
    if (data == null) {
      throw new NotFoundException('未找到单词');
    }
    return data;
  }

  /**
   * 获取单词的发音
   */
  @Get(':word/pronunciation')
  async getPronunciation(
    @Param('word', new RequiredParamPipe()) word: string,
    @Query('slow', ParseBoolPipe) slow: boolean = false,
    @Query('lang', new RequiredParamPipe()) lang: Lang,
    @Res()
    res: Response,
  ) {
    const pronunciation = await this.dictPronunciationService.loadRandomSpeaker(
      word,
      lang,
      slow,
    );
    const buffer = pronunciation?.pronunciation;
    this.logger.debug(
      `getWordPronunciation pronunciationId=${pronunciation?.id} bufferLen:${buffer?.length ?? 0} speaker=${pronunciation?.speaker} word=${word} slow=${slow} lang=${lang}`,
    );
    if (!buffer) {
      throw new NotFoundException('未找到单词');
    }

    // 设置响应头
    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': `inline; filename="dict-voice-${dayjs().unix()}.opus"`,
      'Content-Length': buffer.length,
    });

    // Buffer 输出音频 (不再使用 stream.pipe)
    return res.end(buffer);
  }
}
