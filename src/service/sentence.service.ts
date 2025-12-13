import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { range, sampleSize, shuffle } from 'lodash';
import { SentenceDto } from 'src/dto/sentence.dto';
import { Lang } from 'src/enum/lang.enum';
import { SentenceHistory } from 'src/model/sentence-history.model';
import { Sentence } from 'src/model/sentence.model';
import { User } from 'src/model/user.model';
import { Tokenizer } from 'src/tool/tokenizer';
import { randomAB } from 'src/tool/tool';
import { Repository } from 'typeorm';

@Injectable()
export class SentenceService {
  private readonly logger = new Logger(SentenceService.name);
  private readonly langMap: Record<Lang, keyof Sentence> = {
    [Lang.EN]: 'en',
    [Lang.ZH_CN]: 'zhCn',
    [Lang.JA]: 'ja',
  };

  constructor(
    @InjectRepository(Sentence)
    private sentenceRepository: Repository<Sentence>,
    @InjectRepository(SentenceHistory)
    private wordsHistoryRepository: Repository<SentenceHistory>,
    private readonly tokenizer: Tokenizer,
  ) {}

  async getVersion(): Promise<
    {
      lang: Lang;
      updatedAt: string;
      totalCount: string;
    }[]
  > {
    return this.sentenceRepository
      .createQueryBuilder('sentence')
      .select('sentence.lang', 'lang')
      .addSelect('MAX(sentence.updatedAt)', 'updatedAt')
      .addSelect('COUNT(*)', 'totalCount')
      .groupBy('sentence.lang')
      .getRawMany();
  }

  async getSentences(user: User, lang: Lang): Promise<Sentence[]> {
    // 生成randomMod范围内的randomCount个数字组成一个数组
    const randomMod = 100;
    const randomCount = 20;
    const randomSubs = sampleSize(shuffle(range(randomMod)), randomCount);

    // 获取N个随机句子
    const models = await this.sentenceRepository
      .createQueryBuilder()
      .where(`id % ${randomMod} in (${randomSubs.join(',')})`)
      .andWhere('level = :wordsLevel', {
        wordsLevel: user.wordsLevel,
      })
      .andWhere('lang = :lang', { lang })
      .limit(20)
      .orderBy('bad_score', 'ASC')
      .getMany();

    return shuffle(models);
  }

  toSentenceDto(model: Sentence, sourceLang: Lang, user: User): SentenceDto {
    const langKey = this.langMap[model.lang];
    const sentence = (model[langKey] as string) ?? '';
    const words = this.tokenizer.tokenize(sentence, model.lang);
    return {
      id: model.id,
      words,
      wordsLang: model.lang,
      translation: (model[this.langMap[sourceLang]] as string) ?? '',
      type: randomAB('listen', 'say', user.sayRatio),
    };
  }

  async bad(sentenceId: string) {
    await this.sentenceRepository.increment(
      {
        id: sentenceId,
      },
      'badScore',
      1,
    );
  }

  async remember(
    sentenceId: string,
    hintCount: number,
    thinkingTime: number,
    userId: string,
  ) {
    const history = await this.wordsHistoryRepository.findOneBy({
      userId,
      sentenceId,
    });
    if (!history) {
      await this.wordsHistoryRepository.insert(
        new SentenceHistory({
          userId,
          sentenceId,
          currHintCount: hintCount,
          hintCount,
          rememberedCount: 1,
          // 暂无计算的计划
          currThinkingTime: thinkingTime,
          thinkingTime,
        }),
      );
    } else {
      await this.wordsHistoryRepository.update(
        { userId, sentenceId },
        {
          hintCount: history.hintCount + hintCount,
          currHintCount: hintCount,
          thinkingTime: history.thinkingTime + thinkingTime,
          currThinkingTime: thinkingTime,
          rememberedCount: history.rememberedCount + 1,
        },
      );
    }
  }
}
