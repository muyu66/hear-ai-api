import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { SystemInfoDto } from 'src/dto/system.dto';
import { Lang } from 'src/enum/lang.enum';
import { System } from 'src/model/system.model';
import { WelcomeWords } from 'src/model/welcome-words.model';
import { Repository } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(WelcomeWords)
    private readonly welcomesentenceRepository: Repository<WelcomeWords>,
    @InjectRepository(System)
    private readonly systemRepository: Repository<System>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async getCachedWelcomeWords(lang: Lang): Promise<string[]> {
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

  async getSystemInfo(): Promise<SystemInfoDto> {
    const system = await this.systemRepository.findOneBy({});
    return {
      androidAppVersion: system?.androidAppVersion ?? '',
    };
  }
}
