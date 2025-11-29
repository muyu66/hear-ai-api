import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WordsDto } from 'src/dto/words.dto';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { Words } from 'src/model/words.model';
import { AiRequest } from 'src/tool/ai-request';
import { md5, sleep } from 'src/tool/tool';
import { VoiceStore } from 'src/tool/voice-store';
import { formatBufferWavToOpus } from 'src/tool/voice/format';
import { VoiceAliRequest } from 'src/tool/voice/voice-ali-request';
import { Repository } from 'typeorm';

@Injectable()
export class AddService {
  private readonly logger = new Logger(AddService.name);

  constructor(
    @InjectRepository(Words)
    private wordsRepository: Repository<Words>,
    private readonly voiceAliRequest: VoiceAliRequest,
    private readonly aiRequest: AiRequest,
    private readonly voiceStore: VoiceStore,
  ) {}

  async addWords(sourceLang: Lang, targetLang: Lang, level: WordsLevel) {
    for (let i = 0; i < 100; i++) {
      try {
        this.logger.debug(`开始添加单词 第${i}轮`);
        const wordsRaw = await this.aiRequest.requestWords(40, level);
        console.log(wordsRaw);
        const words = <WordsDto[]>JSON.parse(wordsRaw);
        const models = words.map((dto) => {
          const model = new Words();
          model.source = dto.words;
          model.sourceLang = sourceLang;
          model.target = dto.translation;
          model.targetLang = targetLang;
          model.level = level;
          model.md5 = md5(dto.words);
          model.badScore = 0;
          return model;
        });
        await this.wordsRepository.upsert(models, {
          conflictPaths: ['md5'],
        });
      } catch (e: any) {
        this.logger.error(`单词 第${i}轮 异常`);
        this.logger.error(e);
      }
      await sleep(2000);
    }
  }

  async addVoices(
    speakerObj: { name: string; id: string },
    offset: number = 0,
  ) {
    try {
      // 因为API限制，目前一个一个处理
      this.logger.debug(
        `正在获取 Speaker=${speakerObj.name} Offset=${offset} 音频...`,
      );
      const wordModel = await this.wordsRepository
        .createQueryBuilder('w')
        .limit(1)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getOneOrFail();

      for (const isSlow of [false, true]) {
        const exist = await this.voiceStore.exist(
          this.voiceStore.getFileName(wordModel.id, speakerObj.name, isSlow),
        );
        if (exist) {
          this.logger.debug(
            `音频已存在，跳过 Speaker=${speakerObj.name} Words=${wordModel.source} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
          );
          continue;
        }

        this.logger.debug(
          `正在获取 Speaker=${speakerObj.name} Words=${wordModel.source} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
        );
        const wavVoice = await this.voiceAliRequest.request(
          wordModel.source,
          speakerObj.id,
          isSlow,
        );

        this.logger.debug(
          `正在Opus转码 Speaker=${speakerObj.name} Words=${wordModel.source} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
        );
        const opusVoice = await formatBufferWavToOpus(wavVoice);

        await this.voiceStore.upload(
          this.voiceStore.getFileName(wordModel.id, speakerObj.name, isSlow),
          opusVoice,
        );
      }

      // 上传当前索引
      await this.voiceStore.upload(
        this.voiceStore.getFileIndexName(speakerObj.name),
        Buffer.from(offset + ''),
      );

      await sleep(2000);
      offset++;
      await this.addVoices(speakerObj, offset);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
