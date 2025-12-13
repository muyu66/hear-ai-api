import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/decorator/public.decorator';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { AddService } from 'src/service/add.service';
import { ConfigService } from 'src/service/config.service';

@Public()
@Controller('add')
export class AddController {
  constructor(
    private readonly addService: AddService,
    private readonly configService: ConfigService,
  ) {}

  @Get('sentences')
  async addSentences() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addSentences(WordsLevel.VERY_EASY);
  }

  @Get('voices')
  async addVoices() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addVoices();
  }

  @Get('ai-dicts')
  async addAiDict() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addAiDictByLang(Lang.EN);
  }

  @Get('ai-dicts-ja')
  async addAiDictJa() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addAiDictByLang(Lang.JA);
  }

  @Get('dict-voices')
  async addDictVoice() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addDictVoices();
  }
}
