import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SentenceDto } from 'src/dto/sentence.dto';
import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { Sentence } from 'src/model/sentence.model';
import { AiRequest } from 'src/tool/ai-request';
import { md5, sleep } from 'src/tool/tool';
import { VoiceStore } from 'src/tool/voice-store';
import { formatBufferWavToOpus } from 'src/tool/voice/format';
import { VoiceAliRequest } from 'src/tool/voice/voice-ali-request';
import { In, Repository } from 'typeorm';
import { WordTokenizer } from 'natural';
import { AiDict } from 'src/model/ai-dict.model';
import { promises as fs } from 'fs';
import _ from 'lodash';

@Injectable()
export class AddService {
  private readonly logger = new Logger(AddService.name);
  private readonly FILE_PATH_ADD_DICT = './last-id-add-dict.txt';

  constructor(
    @InjectRepository(Sentence)
    private sentenceRepository: Repository<Sentence>,
    @InjectRepository(AiDict)
    private aiDictRepository: Repository<AiDict>,
    private readonly voiceAliRequest: VoiceAliRequest,
    private readonly aiRequest: AiRequest,
    private readonly voiceStore: VoiceStore,
  ) {}

  async saveLastProcessedId(filePath: string, id: number) {
    await fs.writeFile(filePath, id.toString(), 'utf-8');
  }

  async getLastProcessedId(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return parseInt(content, 10);
    } catch {
      return 0; // 文件不存在就从0开始
    }
  }

  async addSentences(sourceLang: Lang, targetLang: Lang, level: WordsLevel) {
    let i = 1;
    while (true) {
      try {
        this.logger.debug(`开始添加句子 第${i}轮 ...`);

        const raw = await this.aiRequest.requestWords(40, level);
        this.logger.debug(`AI返回原文数据 第${i}轮 ... ${raw}`);

        const sentences = <SentenceDto[]>JSON.parse(raw);
        const models = sentences.map((dto) => {
          const model = new Sentence();
          model.source = dto.words;
          model.sourceLang = sourceLang;
          model.target = dto.translation;
          model.targetLang = targetLang;
          model.level = level;
          model.md5 = md5(dto.words);
          model.badScore = 0;
          return model;
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

  async addVoices(
    speakerObj: { name: string; id: string },
    offset: number = 0,
  ) {
    try {
      // 因为API限制，目前一个一个处理
      this.logger.debug(
        `正在获取 Speaker=${speakerObj.name} Offset=${offset} 音频...`,
      );
      const wordModel = await this.sentenceRepository
        .createQueryBuilder('w')
        .limit(1)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getOneOrFail();

      for (const isSlow of [false, true]) {
        const exist = await this.voiceStore.exist(
          this.voiceStore.getFileName(
            wordModel.id,
            speakerObj.name,
            'words',
            isSlow,
          ),
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
          this.voiceStore.getFileName(
            wordModel.id,
            speakerObj.name,
            'words',
            isSlow,
          ),
          opusVoice,
        );
      }

      // 上传当前索引
      await this.voiceStore.upload(
        this.voiceStore.getFileIndexName(speakerObj.name, 'words'),
        Buffer.from(offset + ''),
      );

      await sleep(2000);
      offset++;
      await this.addVoices(speakerObj, offset);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async addWordVoices(speakerObj: { name: string; id: string }) {
    const indexBuff = await this.voiceStore.getBuffer(
      this.voiceStore.getFileIndexName(speakerObj.name, 'word'),
    );
    const index = indexBuff?.toString('utf8')
      ? Number(indexBuff?.toString('utf8'))
      : 0;
    return this.addWordVoicesCore(speakerObj, index, []);
  }

  private async addWordVoicesCore(
    speakerObj: { name: string; id: string },
    offset: number = 0,
    done: string[],
  ) {
    try {
      // 因为API限制，目前一个一个处理
      this.logger.debug(
        `正在获取单词音频 Speaker=${speakerObj.name} Offset=${offset} 音频...`,
      );
      const wordModel = await this.sentenceRepository
        .createQueryBuilder('w')
        .limit(1)
        .offset(offset)
        .orderBy('w.id', 'ASC')
        .getOneOrFail();

      const tokenizer = new WordTokenizer();
      const words = tokenizer
        .tokenize(wordModel.source)
        .map((v) => v.toLowerCase());

      for (const word of words) {
        if (done.includes(word)) {
          this.logger.debug(
            `[缓存数量=${done.length}] 单词已缓存无需处理，跳过 Word=${word} Speaker=${speakerObj.name} WordsId=${wordModel.id} Offset=${offset} 音频...`,
          );
          continue;
        }
        await sleep(200);

        this.logger.debug(
          `正在获取单词音频 Word=${word} Speaker=${speakerObj.name} Offset=${offset} 音频...`,
        );

        for (const isSlow of [false, true]) {
          const exist = await this.voiceStore.exist(
            this.voiceStore.getFileName(word, speakerObj.name, 'word', isSlow),
          );
          if (exist) {
            this.logger.debug(
              `单词音频音频已存在，跳过 Word=${word} Speaker=${speakerObj.name} WordsId=${wordModel.id} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
            );
            continue;
          }

          this.logger.debug(
            `正在获取单词音频 Word=${word} Speaker=${speakerObj.name} WordsId=${wordModel.id} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
          );
          const wavVoice = await this.voiceAliRequest.request(
            word,
            speakerObj.id,
            isSlow,
          );

          this.logger.debug(
            `正在单词音频Opus转码 Word=${word} Speaker=${speakerObj.name} WordsId=${wordModel.id} Offset=${offset} ${isSlow ? '慢速' : '正常'}音频...`,
          );
          const opusVoice = await formatBufferWavToOpus(wavVoice);

          await this.voiceStore.upload(
            this.voiceStore.getFileName(word, speakerObj.name, 'word', isSlow),
            opusVoice,
          );
        }
      }
      done.push(...words);

      // 上传当前索引
      await this.voiceStore.upload(
        this.voiceStore.getFileIndexName(speakerObj.name, 'word'),
        Buffer.from(offset + ''),
      );

      await sleep(2000);
      offset++;
      await this.addWordVoicesCore(speakerObj, offset, done);
    } catch (e) {
      this.logger.error(e);
    }
  }

  async addAiDict() {
    let lastId = await this.getLastProcessedId(this.FILE_PATH_ADD_DICT);
    const limit = 30;

    while (true) {
      this.logger.debug(`准备获取词典 lastId=${lastId} ...`);
      const wordModels = await this.sentenceRepository
        .createQueryBuilder('w')
        .select(['w.source', 'w.id'])
        .where('w.id > :lastId', { lastId })
        .limit(limit)
        .orderBy('w.id', 'ASC')
        .getMany();

      if (wordModels.length === 0) {
        this.logger.debug(
          `已经完成所有任务 wordModelsCount=${wordModels.length} lastId=${lastId} ...`,
        );
        break;
      }
      this.logger.debug(
        `准备分词 wordModelsCount=${wordModels.length} lastId=${lastId} ...`,
      );

      const tokenizer = new WordTokenizer();
      const words = tokenizer
        .tokenize(wordModels.map((v) => v.source).join(' '))
        .map((v) => v.toLowerCase());

      const existWords = await this.aiDictRepository.find({
        where: { word: In(words) },
        select: ['word'],
      });
      const existSet = new Set(existWords.map((w) => w.word));
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
          { word: string; phonetic: string; translation: string }[]
        >JSON.parse(
          raws
            .trim()
            // 去掉可能包裹的三引号或多余引号
            .replace(/^```json/, '')
            .replace(/```$/, ''),
        );
        const models = objects.map((object) => {
          return new AiDict(object.word, object.phonetic, object.translation);
        });
        await this.aiDictRepository.insert(models);
        this.logger.debug(
          `已成功保存 taskWordsCount=${taskWords.length} lastId=${lastId} ...`,
        );
      }

      const maxId = _.maxBy(wordModels, 'id')?.id;
      lastId = maxId!;
      this.logger.debug(`本轮最大ID maxId=${lastId} ...`);
      await this.saveLastProcessedId(this.FILE_PATH_ADD_DICT, lastId);
    }
  }
}
