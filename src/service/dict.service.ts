import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lang } from 'src/enum/lang.enum';
import { DictModel } from 'src/interface/dict-model';
import { AiDict } from 'src/model/ai-dict.model';
import { FindOptionsWhere, In, Repository } from 'typeorm';

@Injectable()
export class DictService {
  private readonly logger = new Logger(DictService.name);
  private readonly wordMap: Record<Lang, keyof AiDict> = {
    [Lang.EN]: 'en',
    [Lang.ZH_CN]: 'zhCn',
    [Lang.JA]: 'ja',
  };

  private readonly phoneticMap: Record<Lang, keyof AiDict> = {
    [Lang.EN]: 'enPhonetic',
    [Lang.ZH_CN]: 'zhCnPhonetic',
    [Lang.JA]: 'jaPhonetic',
  };

  private readonly translationMap: Record<Lang, keyof AiDict> = {
    [Lang.EN]: 'enTranslation',
    [Lang.ZH_CN]: 'zhCnTranslation',
    [Lang.JA]: 'jaTranslation',
  };

  constructor(
    @InjectRepository(AiDict)
    private aiDictRepository: Repository<AiDict>,
  ) {}

  /** 将实体转换为 DictModel */
  private toDictModel(
    model: AiDict,
    sourceLang: Lang,
    targetLang: Lang,
  ): DictModel {
    // 处理 phonetic 格式
    const formatPhonetic = (lang: Lang, value: string | undefined) => {
      if (!value) return '';
      return lang === Lang.EN ? `/${value.replace(/^\/+|\/+$/g, '')}/` : value;
    };

    // 处理翻译格式
    const formatTranslation = (lang: Lang, value: string | undefined) => {
      if (!value) return '';
      if (lang === Lang.ZH_CN) {
        return value
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/\\r\\n|\\n|\\r/g, '\n')
          .replace(/\r\n|\r/g, '\n');
      }
      return value;
    };

    const dictModel: DictModel = {
      id: model.id,
      word: (model[this.wordMap[targetLang]] as string) || '',
      phonetic: formatPhonetic(
        targetLang,
        model[this.phoneticMap[targetLang]] as string,
      ),
      translation: formatTranslation(
        sourceLang,
        model[this.translationMap[sourceLang]] as string,
      ),
      badScore: model.badScore,
    };

    return dictModel;
  }

  /** 获取多个词典的单词 */
  async getDictsByWord(
    word: string,
    sourceLang: Lang,
    targetLang: Lang,
  ): Promise<DictModel | null> {
    const key = this.wordMap[targetLang] || 'zhCn';
    const model = await this.aiDictRepository.findOneBy({ [key]: word });
    return model == null
      ? null
      : this.toDictModel(model, sourceLang, targetLang);
  }

  /** 获取多个单词 */
  async getDictsByWords(
    word: string[],
    sourceLang: Lang,
    targetLang: Lang,
  ): Promise<DictModel[]> {
    if (word == null || word.length === 0) return [];

    const key = this.wordMap[targetLang] || 'zhCn';
    const where: FindOptionsWhere<AiDict> = {
      [key]: In(word),
    };
    const models = await this.aiDictRepository.findBy(where);
    return models.map((model) =>
      this.toDictModel(model, sourceLang, targetLang),
    );
  }

  /** 增加单词的 badScore */
  async badDict(id: string) {
    await this.aiDictRepository.increment({ id }, 'badScore', 1);
  }
}
