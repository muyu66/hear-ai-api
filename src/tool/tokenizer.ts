import { Injectable } from '@nestjs/common';
import { getTokenizer, Tokenizer as JaTokenizer } from 'kuromojin';
import { WordTokenizer } from 'natural';
import Segment from 'novel-segment';
import { Lang } from 'src/enum/lang.enum';
import { Sentence } from 'src/model/sentence.model';

@Injectable()
export class Tokenizer {
  // 中文分词
  private readonly zhCnTokenizer = new Segment();
  // 英文分词
  private readonly enTokenizer = new WordTokenizer();
  // 日文分词
  private jaTokenizer: JaTokenizer | null = null;

  async onModuleInit() {
    // 使用默认的识别模块及字典，载入字典文件需要1秒，仅初始化时执行一次即可
    this.zhCnTokenizer.useDefault();
    this.jaTokenizer = await getTokenizer();
  }

  tokenizeSentences(sentenceModels: Sentence[], lang: Lang): string[] {
    if (lang === Lang.EN) {
      return this.tokenize(sentenceModels.map((v) => v.en).join(' '), lang);
    } else if (lang === Lang.ZH_CN) {
      return this.tokenize(sentenceModels.map((v) => v.zhCn).join(' '), lang);
    } else {
      // ja
      return this.tokenize(sentenceModels.map((v) => v.ja).join(' '), lang);
    }
  }

  tokenize(sentence: string, lang: Lang): string[] {
    if (this.jaTokenizer == null) {
      throw new Error('日语分词器尚未初始化');
    }

    if (lang === Lang.EN) {
      return this.enTokenizer.tokenize(sentence).map((v) => v.toLowerCase());
    } else if (lang === Lang.ZH_CN) {
      return this.zhCnTokenizer.doSegment(sentence, {
        simple: true,
        stripPunctuation: true,
        convertSynonym: false,
        stripStopword: false,
        stripSpace: true,
      });
    } else {
      // ja
      const tokenizeWords = this.jaTokenizer.tokenize(sentence);
      return tokenizeWords.map((v) => v.basic_form);
    }
  }
}
