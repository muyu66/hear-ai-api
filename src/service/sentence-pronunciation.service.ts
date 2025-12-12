import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lang } from 'src/enum/lang.enum';
import { SentencePronunciation } from 'src/model/sentence-pronunciation.model';
import { Repository } from 'typeorm';

@Injectable()
export class SentencePronunciationService {
  private readonly logger = new Logger(SentencePronunciationService.name);

  constructor(
    @InjectRepository(SentencePronunciation)
    private sentencePronunciationRepository: Repository<SentencePronunciation>,
  ) {}

  async exist(sentenceId: string, lang: Lang, speaker: string, slow: boolean) {
    return this.sentencePronunciationRepository.existsBy({
      sentenceId,
      lang,
      speaker,
      slow,
    });
  }

  async loadRandomSpeaker(
    sentenceId: string,
    lang: Lang,
    slow: boolean,
  ): Promise<Buffer | null> {
    const model = await this.sentencePronunciationRepository
      .createQueryBuilder('p')
      .where('p.sentenceId = :sentenceId', { sentenceId })
      .andWhere('p.lang = :lang', { lang })
      .andWhere('p.slow = :slow', { slow })
      .orderBy('RAND()')
      .limit(1)
      .getOne();

    return model?.pronunciation ?? null;
  }

  async save(
    sentenceId: string,
    lang: Lang,
    speaker: string,
    pronunciation: Buffer,
    slow: boolean,
  ) {
    await this.sentencePronunciationRepository.insert({
      sentenceId,
      lang,
      pronunciation,
      slow,
      speaker,
    });
  }
}
