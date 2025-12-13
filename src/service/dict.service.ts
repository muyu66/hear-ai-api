import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lang } from 'src/enum/lang.enum';
import { DictModel } from 'src/interface/dict-model';
import { AiDict } from 'src/model/ai-dict.model';
import { FindOptionsWhere, In, Repository } from 'typeorm';

@Injectable()
export class DictService {
  private readonly logger = new Logger(DictService.name);
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
  private toDictModel(model: AiDict, sourceLang: Lang): DictModel {
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
      word: model.word,
      phonetic: model.phonetic,
      translation: formatTranslation(
        sourceLang,
        model[this.translationMap[sourceLang]] as string,
      ),
      badScore: model.badScore,
    };

    return dictModel;
  }

  /** 获取单词 */
  async getDictsByWord(
    word: string,
    sourceLang: Lang,
    targetLang: Lang,
  ): Promise<DictModel | null> {
    const model = await this.aiDictRepository.findOneBy({
      word,
      lang: targetLang,
    });
    return model == null ? null : this.toDictModel(model, sourceLang);
  }

  /** 获取多个单词 */
  async getDictsByWords(
    words: string[],
    sourceLang: Lang,
    targetLang: Lang,
  ): Promise<DictModel[]> {
    if (words == null || words.length === 0) return [];

    const where: FindOptionsWhere<AiDict> = {
      word: In(words),
      lang: targetLang,
    };
    const models = await this.aiDictRepository.findBy(where);
    return models.map((model) => this.toDictModel(model, sourceLang));
  }

  /** 增加单词的 badScore */
  async badDict(id: string) {
    await this.aiDictRepository.increment({ id }, 'badScore', 1);
  }
}
