import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { Lang } from 'src/enum/lang.enum';
import { WelcomeWords } from 'src/model/welcome-words.model';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(WelcomeWords)
    private readonly welcomesentenceRepository: Repository<WelcomeWords>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getCachedWelcomeWords(lang: Lang): Promise<string[]> {
    const cacheKey = `welcome_words_${lang}`;

    // 先尝试从缓存取
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const welcomeWords = await this.welcomesentenceRepository.findBy({
      wordsLang: lang,
    });
    const data = welcomeWords.map((v) => v.words);
    // 写进缓存
    await this.cacheManager.set(cacheKey, data, 1000 * 60 * 30);
    return data;
  }

  async getRandomWelcomeWords(lang: Lang): Promise<string> {
    const words = await this.getCachedWelcomeWords(lang);
    return _.shuffle(words)[0];
  }
}
