import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/decorator/public.decorator';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { AddService } from 'src/service/add.service';
import { ConfigService } from 'src/service/config.service';
import { VoiceSpeaker } from 'src/tool/voice/voice-speaker';

@Public()
@Controller('add')
export class AddController {
  constructor(
    private readonly addService: AddService,
    private readonly configService: ConfigService,
    private readonly voiceSpeaker: VoiceSpeaker,
  ) {}

  @Get('sentences')
  async addSentences() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addSentences(Lang.EN, Lang.ZH_CN, WordsLevel.EASY);
  }

  @Get('voices')
  async addVoices() {
    if (this.configService.env !== 'development') {
      return;
    }
    const speakerObj = this.voiceSpeaker.ALI_ERIC;
    return this.addService.addVoices(speakerObj);
  }

  @Get('word-voices')
  async addWordVoice() {
    if (this.configService.env !== 'development') {
      return;
    }
    const speakerObj = this.voiceSpeaker.ALI_EVA;
    return this.addService.addWordVoices(speakerObj);
  }

  @Get('ai-dicts')
  async addAiDict() {
    if (this.configService.env !== 'development') {
      return;
    }
    return this.addService.addAiDict();
  }
}
