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
    repo: Repository<Dict | AiDict>;
  }[] {
    return [
      { dict: 'ecdict', repo: this.dictRepository },
      { dict: 'ai', repo: this.aiDictRepository },
    ];
  }

  /** 将实体转换为 DictModel */
  private toDictModel(model: Dict | AiDict): DictModel {
    return {
      word: model.word,
      badScore: model.badScore,
      phonetic: model.phonetic || '',
      translation: model.translation || '',
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
  ): Promise<{ [key in DictType]?: DictModel }> {
    const repos = this.getRepositories();
    const res: { [key in DictType]?: DictModel } = {};
    for (const { repo, dict } of repos) {
      const model = await repo.findOneBy({ word });
      if (model == null) continue;
      Object.assign(res, {
        [dict]: this.toDictModel(model),
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
