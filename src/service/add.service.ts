import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import _ from 'lodash';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { AiDict } from 'src/model/ai-dict.model';
import { Sentence } from 'src/model/sentence.model';
import { AiRequest } from 'src/tool/ai-request';
import { Tokenizer } from 'src/tool/tokenizer';
import { md5 } from 'src/tool/tool';
import { formatBufferWavToOpus } from 'src/tool/voice/format';
import { VoiceAliRequest } from 'src/tool/voice/voice-ali-request';
import { SPEAKER } from 'src/tool/voice/voice-speaker';
import { In, Repository } from 'typeorm';
import { DictPronunciationService } from './dict-pronunciation.service';
import { SentencePronunciationService } from './sentence-pronunciation.service';

@Injectable()
export class AddService {
  private readonly logger = new Logger(AddService.name);
  private readonly FILE_PATH_ADD_DICT_EN = './last-id-add-dict-en.txt';
  private readonly FILE_PATH_ADD_DICT_ZH_CN = './last-id-add-dict-zh-cn.txt';
  private readonly FILE_PATH_ADD_DICT_JA = './last-id-add-dict-ja.txt';

  private readonly langMap: Record<Lang, keyof Sentence> = {
    [Lang.EN]: 'en',
    [Lang.ZH_CN]: 'zhCn',
    [Lang.JA]: 'ja',
  };

  constructor(
    @InjectRepository(Sentence)
    private sentenceRepository: Repository<Sentence>,
    @InjectRepository(AiDict)
    private aiDictRepository: Repository<AiDict>,
    private readonly voiceAliRequest: VoiceAliRequest,
    private readonly aiRequest: AiRequest,
    private readonly sentencePronunciationService: SentencePronunciationService,
    private readonly dictPronunciationService: DictPronunciationService,
    private readonly tokenizer: Tokenizer,
  ) {}

  async saveLastProcessedId(filePath: string, id: string) {
    await fs.writeFile(filePath, id, 'utf-8');
  }

  async getLastProcessedId(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '0'; // 文件不存在就从0开始
    }
  }

  async addSentences(level: WordsLevel) {
    let i = 1;
    while (true) {
      try {
        this.logger.debug(`开始添加句子 第${i}轮 ...`);

        const raw = await this.aiRequest.requestWords(40, level);
        this.logger.debug(`AI返回原文数据 第${i}轮 ... ${raw}`);

        const sentences = <{ en: string; zhCn: string; ja: string }[]>(
          JSON.parse(raw)
        );
        const models = sentences.map((dto) => {
          return new Sentence({
            en: dto.en,
            zhCn: dto.zhCn,
            ja: dto.ja,
            badScore: 0,
            md5: md5(dto.en),
            level: level,
          });
        });
        this.logger.debug(`AI返回数据 第${i}轮 count=${models.length} ...`);

        // 过滤并去重
        const uniqModels = _.uniqBy(models, 'md5');
        const existSentences = await this.sentenceRepository.find({
          where: { md5: In(uniqModels.map((v) => v.md5)) },
          select: ['md5'],
        });
        const existMd5Set = new Set(existSentences.map((w) => w.md5));
        const taskModels = Array.from(new Set(uniqModels)).filter(
          (w) => !existMd5Set.has(w.md5),
        );
        this.logger.debug(`去重后 第${i}轮 count=${taskModels.length} ...`);

        await this.sentenceRepository.save(taskModels);
        this.logger.debug(`保存成功 第${i}轮 ...`);
        i++;
      } catch (e) {
        this.logger.error(`添加句子 第${i}轮 异常`);
        this.logger.error(e);
      }
    }
  }

  async addVoices() {
    let offset = 0;
    while (true) {
      // 因为API限制，目前一个一个处理
      this.logger.debug(`正在获取 Offset=${offset} 音频...`);
      const sentenceModel = await this.sentenceRepository
        .createQueryBuilder('w')
        .limit(1)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getOneOrFail();

      for (const lang in SPEAKER) {
        const speakers = SPEAKER[lang as Lang];
        for (const speaker of speakers) {
          for (const slow of [false, true]) {
            const sentence = sentenceModel[
              this.langMap[lang as Lang]
            ] as string;
            const exist = await this.sentencePronunciationService.exist(
              sentenceModel.id,
              lang as Lang,
              speaker.name,
              slow,
            );
            if (exist) {
              this.logger.debug(
                `音频已存在，跳过 Speaker=${speaker.name} lang=${lang} sentenceId=${sentenceModel.id} sentence=${sentence} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
              );
              continue;
            }
            this.logger.debug(
              `正在获取 Speaker=${speaker.name} lang=${lang} sentenceId=${sentenceModel.id} sentence=${sentence} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
            const wavVoice = await this.voiceAliRequest.request(
              sentence,
              speaker.id,
              slow,
            );

            this.logger.debug(
              `正在Opus转码 Speaker=${speaker.name} lang=${lang} sentenceId=${sentenceModel.id} sentence=${sentence} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
            const opusVoice = await formatBufferWavToOpus(wavVoice);

            await this.sentencePronunciationService.save(
              sentenceModel.id,
              lang as Lang,
              speaker.name,
              opusVoice,
              slow,
            );
            this.logger.debug(
              `上传音频成功 Speaker=${speaker.name} lang=${lang} sentenceId=${sentenceModel.id} sentence=${sentence} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
          }
        }
      }
      offset++;
    }
  }

  async addAiDictByLang(lang: Lang, limit = 10) {
    const filePath =
      lang === Lang.EN
        ? this.FILE_PATH_ADD_DICT_EN
        : lang === Lang.ZH_CN
          ? this.FILE_PATH_ADD_DICT_ZH_CN
          : this.FILE_PATH_ADD_DICT_JA;

    let lastId = await this.getLastProcessedId(filePath);

    while (true) {
      this.logger.debug(`准备获取词典 lastId=${lastId} ...`);
      const sentenceModels = await this.sentenceRepository
        .createQueryBuilder('w')
        .where('w.id > :lastId', { lastId })
        .limit(limit)
        .orderBy('w.id', 'ASC')
        .getMany();

      if (sentenceModels.length === 0) {
        this.logger.debug(
          `已经完成所有任务 sentenceModelsCount=${sentenceModels.length} lastId=${lastId} ...`,
        );
        break;
      }

      this.logger.debug(
        `准备分词 sentenceModelsCount=${sentenceModels.length} lastId=${lastId} ...`,
      );

      // 根据语言选择分词器
      const words: string[] = this.tokenizer.tokenizeSentences(
        sentenceModels,
        lang,
      );

      // 查询已存在的词
      const existWords = await this.aiDictRepository.find({
        where:
          lang === Lang.EN
            ? { en: In(words) }
            : lang === Lang.ZH_CN
              ? { zhCn: In(words) }
              : { ja: In(words) },
        select: [lang === Lang.EN ? 'en' : lang === Lang.ZH_CN ? 'zhCn' : 'ja'],
      });

      const existSet = new Set(
        existWords.map((w) =>
          lang === Lang.EN ? w.en : lang === Lang.ZH_CN ? w.zhCn : w.ja,
        ),
      );

      // 过滤并去重
      const taskWords = Array.from(new Set(words)).filter(
        (w) => !existSet.has(w),
      );

      this.logger.debug(
        `准备获取单词 taskWordsCount=${taskWords.length} lastId=${lastId} ...`,
      );

      if (taskWords.length > 0) {
        const raws = await this.aiRequest.requestDict(taskWords);
        this.logger.debug(raws);

        const objects = <
          {
            en: string;
            enPhonetic: string;
            enTranslation: string;
            zhCn: string;
            zhCnPhonetic: string;
            zhCnTranslation: string;
            ja: string;
            jaPhonetic: string;
            jaTranslation: string;
          }[]
        >JSON.parse(
          raws
            .trim()
            .replace(/^```json/, '')
            .replace(/```$/, ''),
        );

        const models = objects.map((object) => {
          return new AiDict({
            en: object.en.toLowerCase(),
            enPhonetic: object.enPhonetic,
            enTranslation: object.enTranslation,
            zhCn: object.zhCn,
            zhCnPhonetic: object.zhCnPhonetic,
            zhCnTranslation: object.zhCnTranslation,
            ja: object.ja,
            jaPhonetic: object.jaPhonetic,
            jaTranslation: object.jaTranslation,
          });
        });

        await this.aiDictRepository.insert(models);
        this.logger.debug(
          `已成功保存 taskWordsCount=${taskWords.length} lastId=${lastId} ...`,
        );
      }

      const maxId = _.maxBy(sentenceModels, 'id')?.id;
      lastId = maxId!;
      this.logger.debug(`本轮最大ID maxId=${lastId} ...`);
      await this.saveLastProcessedId(filePath, lastId);
    }
  }

  async addDictVoices() {
    let offset = 0;
    while (true) {
      // 因为API限制，目前一个一个处理
      this.logger.debug(`正在获取 Offset=${offset} 音频...`);
      const dictModel = await this.aiDictRepository
        .createQueryBuilder('w')
        .limit(1)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getOneOrFail();

      for (const lang in SPEAKER) {
        const speakers = SPEAKER[lang as Lang];
        for (const speaker of speakers) {
          for (const slow of [false, true]) {
            const word = dictModel[this.langMap[lang as Lang]] as
              | string
              | undefined;
            if (word == undefined || word.length === 0) {
              this.logger.debug(
                `无法识别内容，跳过 Speaker=${speaker.name} lang=${lang} dictModelId=${dictModel.id} word=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
              );
              continue;
            }
            const exist = await this.dictPronunciationService.exist(
              word,
              lang as Lang,
              speaker.name,
              slow,
            );
            if (exist) {
              this.logger.debug(
                `音频已存在，跳过 Speaker=${speaker.name} lang=${lang} dictModelId=${dictModel.id} word=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
              );
              continue;
            }
            this.logger.debug(
              `正在获取 Speaker=${speaker.name} lang=${lang} dictModelId=${dictModel.id} word=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
            const wavVoice = await this.voiceAliRequest.request(
              word,
              speaker.id,
              slow,
            );

            this.logger.debug(
              `正在Opus转码 Speaker=${speaker.name} lang=${lang} dictModelId=${dictModel.id} word=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
            const opusVoice = await formatBufferWavToOpus(wavVoice);

            await this.dictPronunciationService.save(
              word,
              dictModel.id,
              lang as Lang,
              speaker.name,
              opusVoice,
              slow,
            );
            this.logger.debug(
              `上传音频成功 Speaker=${speaker.name} lang=${lang} sentenceId=${dictModel.id} sentence=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
          }
        }
      }
      offset++;
    }
  }
}
