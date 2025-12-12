import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lang } from 'src/enum/lang.enum';
import { DictPronunciation } from 'src/model/dict-pronunciation.model';
import { Repository } from 'typeorm';

@Injectable()
export class DictPronunciationService {
  private readonly logger = new Logger(DictPronunciationService.name);

  constructor(
    @InjectRepository(DictPronunciation)
    private dictPronunciationRepository: Repository<DictPronunciation>,
  ) {}

  async exist(word: string, lang: Lang, speaker: string, slow: boolean) {
    return this.dictPronunciationRepository.existsBy({
      word,
      lang,
      speaker,
      slow,
    });
  }

  async loadRandomSpeaker(
    word: string,
    lang: Lang,
    slow: boolean,
  ): Promise<Buffer | null> {
    const model = await this.dictPronunciationRepository
      .createQueryBuilder('p')
      .where('p.word = :word', { word })
      .andWhere('p.lang = :lang', { lang })
      .andWhere('p.slow = :slow', { slow })
      .orderBy('RAND()')
      .limit(1)
      .getOne();

    return model?.pronunciation ?? null;
  }

  async save(
    word: string,
    dictId: string,
    lang: Lang,
    speaker: string,
    pronunciation: Buffer,
    slow: boolean,
  ) {
    await this.dictPronunciationRepository.insert({
      word,
      dictId,
      lang,
      pronunciation,
      slow,
      speaker,
    });
  }
}
