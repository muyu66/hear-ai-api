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
        for (const lang of [Lang.EN, Lang.JA]) {
          this.logger.debug(`开始添加句子 第${i}轮 lang=${lang} ...`);
          const raw = await this.aiRequest.requestWords(40, level, lang);
          this.logger.debug(`AI返回原文数据 第${i}轮 lang=${lang} ... ${raw}`);
          const sentences = <{ en: string; zhCn: string; ja: string }[]>(
            JSON.parse(raw)
          );
          const models = sentences.map((dto) => {
            const words = lang === Lang.EN ? dto.en : dto.ja;
            return new Sentence({
              words,
              lang,
              en: dto.en,
              zhCn: dto.zhCn,
              ja: dto.ja,
              badScore: 0,
              md5: md5(words),
              level: level,
            });
          });
          this.logger.debug(
            `AI返回数据 第${i}轮 lang=${lang} count=${models.length} ...`,
          );

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
          this.logger.debug(
            `去重后 第${i}轮 lang=${lang} count=${taskModels.length} ...`,
          );

          await this.sentenceRepository.save(taskModels);
          this.logger.debug(`保存成功 第${i}轮 lang=${lang} ...`);
          i++;
        }
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

      const speakers = SPEAKER[sentenceModel.lang];
      for (const speaker of speakers) {
        for (const slow of [false, true]) {
          const sentence = sentenceModel.words;
          const lang = sentenceModel.lang;
          const exist = await this.sentencePronunciationService.exist(
            sentenceModel.id,
            lang,
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
            lang,
            speaker.name,
            opusVoice,
            slow,
          );
          this.logger.debug(
            `上传音频成功 Speaker=${speaker.name} lang=${lang} sentenceId=${sentenceModel.id} sentence=${sentence} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
          );
        }
      }
      offset++;
    }
  }

  async addAiDict() {
    let offset = 0;

    while (true) {
      this.logger.debug(`准备获取词典 offset=${offset} ...`);
      const sentenceModels = await this.sentenceRepository
        .createQueryBuilder('w')
        .limit(20)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getMany();

      if (sentenceModels.length === 0) {
        this.logger.debug(`没有更多数据了...`);
        break;
      }

      this.logger.debug(`准备分词 offset=${offset} ...`);

      const en = _(sentenceModels)
        .filter((s) => s.lang === Lang.EN)
        .map((s) => s.words.toLowerCase())
        .join(' ');

      const ja = _(sentenceModels)
        .filter((s) => s.lang === Lang.JA)
        .map((s) => s.words)
        .join(' ');

      // 根据语言选择分词器
      const enWords: string[] = this.tokenizer.tokenize(en, Lang.EN);
      const jaWords: string[] =
        ja.length === 0 ? [] : this.tokenizer.tokenize(ja, Lang.JA);

      for (const { words, lang } of [
        { words: enWords, lang: Lang.EN },
        { words: jaWords, lang: Lang.JA },
      ]) {
        if (words == null || words.length === 0) {
          this.logger.debug(
            `跳过，没有需要获取的${lang}单词 单词数=${words.length} offset=${offset} ...`,
          );
          continue;
        }

        // 查询已存在的词
        const existWords = await this.aiDictRepository.find({
          where: { word: In(words), lang },
        });
        const existSet = new Set(existWords.map((w) => w.word));
        // 过滤并去重
        const taskWords = Array.from(new Set(words)).filter(
          (w) => !existSet.has(w),
        );
        this.logger.debug(
          `准备获取${lang}单词 单词数=${words.length} 去重后单词数=${taskWords.length} offset=${offset} ...`,
        );

        if (taskWords.length <= 0) {
          this.logger.debug(
            `跳过，没有需要获取的${lang}单词 单词数=${words.length} 去重后单词数=${taskWords.length} offset=${offset} ...`,
          );
          continue;
        }

        const raws = await this.aiRequest.requestDict(taskWords, lang);
        this.logger.debug(raws);

        const objects = <
          {
            word: string;
            phonetic: string[];
            enTranslation: string;
            zhCnTranslation: string;
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
            word: object.word.toLowerCase(),
            lang,
            phonetic: object.phonetic,
            enTranslation: object.enTranslation,
            zhCnTranslation: object.zhCnTranslation,
            jaTranslation: object.jaTranslation,
          });
        });

        await this.aiDictRepository.insert(models);
        this.logger.debug(`已保存成功${lang}单词 offset=${offset} ...`);
      }

      offset += sentenceModels.length;
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

      const speakers = SPEAKER[dictModel.lang];
      for (const speaker of speakers) {
        for (const slow of [false, true]) {
          const word = dictModel.word;
          const lang = dictModel.lang;
          if (word == undefined || word.length === 0) {
            this.logger.debug(
              `无法识别内容，跳过 Speaker=${speaker.name} lang=${lang} dictModelId=${dictModel.id} word=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
            );
            continue;
          }
          const exist = await this.dictPronunciationService.exist(
            word,
            lang,
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
            lang,
            speaker.name,
            opusVoice,
            slow,
          );
          this.logger.debug(
            `上传音频成功 Speaker=${speaker.name} lang=${lang} sentenceId=${dictModel.id} sentence=${word} Offset=${offset} ${slow ? '慢速' : '正常'}音频...`,
          );
        }
      }
      offset++;
    }
  }
}
