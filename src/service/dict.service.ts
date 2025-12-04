import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DictType } from 'src/constant/contant';
import { DictModel } from 'src/interface/dict-model';
import { AiDict } from 'src/model/ai-dict.model';
import { Dict } from 'src/model/dict.model';
import { In, Repository } from 'typeorm';

@Injectable()
export class DictService {
  private readonly logger = new Logger(DictService.name);

  constructor(
    @InjectRepository(Dict)
    private dictRepository: Repository<Dict>,
    @InjectRepository(AiDict)
    private aiDictRepository: Repository<AiDict>,
  ) {}

  /** 根据字典类型获取对应 Repository */
  private getRepository(dict: DictType): Repository<Dict | AiDict> {
    return dict === 'ecdict' ? this.dictRepository : this.aiDictRepository;
  }

  /** 根据字典类型获取对应 Repository */
  private getRepositories(): {
    dict: DictType;
    dictName: string;
    repo: Repository<Dict | AiDict>;
  }[] {
    return [
      { dict: 'ecdict', dictName: '内置词典', repo: this.dictRepository },
      { dict: 'ai', dictName: 'AI词典', repo: this.aiDictRepository },
    ];
  }

  /** 将实体转换为 DictModel */
  private toDictModel(model: Dict | AiDict): DictModel {
    return {
      word: model.word,
      badScore: model.badScore,
      // 统一加音标前后的 /，比如 /xxxx/
      phonetic:
        model.phonetic != null
          ? `/${model.phonetic.replace(/^\/+|\/+$/g, '')}/`
          : '',
      // 统一换行
      translation:
        model.translation != null
          ? model.translation
              .replace(/<br\s*\/?>/gi, '\n')
              // 转义字符文本
              .replace(/\\r\\n/g, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\n')
              // 再统一一下 CRLF
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
          : '',
    };
  }

  /** 获取单词，找不到抛异常 */
  async getDictOrFail(dict: DictType, word: string): Promise<DictModel> {
    const res = await this.getDict(dict, word);
    if (!res) {
      throw new NotFoundException(`dict=${dict} word=${word} not found`);
    }
    return res;
  }

  /** 获取单词，找不到返回 null */
  async getDict(dict: DictType, word: string): Promise<DictModel | null> {
    const repo = this.getRepository(dict);
    const model = await repo.findOneBy({ word });
    return model ? this.toDictModel(model) : null;
  }

  /** 获取多个词典的单词 */
  async getDictsByWord(
    word: string,
  ): Promise<{ dict: DictType; dictName: string; model: DictModel }[]> {
    const repos = this.getRepositories();
    const res: { dict: DictType; dictName: string; model: DictModel }[] = [];
    for (const { repo, dict, dictName } of repos) {
      const model = await repo.findOneBy({ word });
      if (model == null) continue;
      res.push({
        dict,
        dictName,
        model: this.toDictModel(model),
      });
    }
    return res;
  }

  /** 获取多个单词 */
  async getDictsByWords(dict: DictType, words: string[]): Promise<DictModel[]> {
    if (words.length === 0) return [];
    const repo = this.getRepository(dict);
    const models = await repo.findBy({ word: In(words) });
    return models.map((model) => this.toDictModel(model));
  }

  /** 增加单词的 badScore */
  async badDict(dict: DictType, word: string) {
    const repo = this.getRepository(dict);
    await repo.increment({ word }, 'badScore', 1);
  }
}
