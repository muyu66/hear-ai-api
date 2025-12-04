import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Dict } from 'src/model/dict.model';
import { In, Repository } from 'typeorm';

@Injectable()
export class WordService {
  private readonly logger = new Logger(WordService.name);

  constructor(
    @InjectRepository(Dict)
    private dictRepository: Repository<Dict>,
  ) {}

  async getDictOrFail(word: string) {
    return this.dictRepository.findOneByOrFail({
      word,
    });
  }

  async getDict(word: string) {
    return this.dictRepository.findOneBy({
      word,
    });
  }

  async getDictsByWords(words: string[]) {
    return this.dictRepository.findBy({
      word: In(words),
    });
  }

  async badDict(word: string) {
    return this.dictRepository.increment(
      {
        word,
      },
      'badScore',
      1,
    );
  }
}
