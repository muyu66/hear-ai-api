import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/decorator/public.decorator';
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

  @Get('1')
  async add1() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addSentences(WordsLevel.NORMAL);
  }

  @Get('2')
  async add2() {
    if (this.configService.env !== 'development') {
      return;
    }
    await this.addService.addVoices();
    await this.addService.addAiDict();
    await this.addService.addDictVoices();
  }

  @Get('sentences')
  async addSentences() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addSentences(WordsLevel.NORMAL);
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
    return this.addService.addAiDict();
  }

  @Get('dict-voices')
  async addDictVoice() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addDictVoices();
  }
}
