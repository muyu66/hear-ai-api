import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import _ from 'lodash';
import { WordBookSummaryDto } from 'src/dto/word-book.dto';
import { Lang } from 'src/enum/lang.enum';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WelcomeWords } from 'src/model/welcome-words.model';
import { WordBook } from 'src/model/word-book.model';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(WelcomeWords)
    private readonly welcomeWordsRepository: Repository<WelcomeWords>,
    @InjectRepository(WordBook)
    private readonly wordBookRepository: Repository<WordBook>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getCachedWelcomeWords(lang: Lang): Promise<string[]> {
    const cacheKey = `welcome_words_${lang}`;

    // 先尝试从缓存取
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const welcomeWords = await this.welcomeWordsRepository.findBy({
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

  async getWordBookSummary(userId: number): Promise<WordBookSummaryDto> {
    const user = await this.authService.getUserProfile(userId);

    // 今天需要背多少
    // 单词本总共有多少
    const totalCount = await this.wordBookRepository.countBy({
      userId,
    });
    const todayCount =
      (await this.getWordBooksQuery(userId, user.rememberMethod)?.getCount()) ||
      0;
    const tomorrowCount =
      (await this.getWordBooksTomorrowQuery(
        userId,
        user.rememberMethod,
      )?.getCount()) || 0;
    return { totalCount, todayCount, tomorrowCount };
  }

  /**
   * 获取此时的复习量
   * @param userId
   * @returns
   */
  async getWordBookToday(userId: number): Promise<number> {
    const user = await this.authService.getUserProfile(userId);
    return (
      (await this.getWordBooksQuery(userId, user.rememberMethod)?.getCount()) ||
      0
    );
  }

  async getWordBooks(userId: number, limit: number) {
    const user = await this.authService.getUserProfile(userId);

    const query = this.getWordBooksQuery(userId, user.rememberMethod);
    if (!query) {
      return [];
    }
    return query.limit(limit).getMany();
  }

  getWordBooksQuery(userId: number, rememberMethod: RememberMethod) {
    let fitlerSql = '';
    if (rememberMethod === RememberMethod.POW) {
      fitlerSql =
        'NOW() > DATE_ADD(w.updated_at, INTERVAL POW(w.remembered_count, 1.5) DAY)';
    } else if (rememberMethod === RememberMethod.FC) {
      fitlerSql =
        'NOW() > DATE_ADD(updated_at, INTERVAL GREATEST(1, 1 + remembered_count*1.5 - hint_count * 0.1) * 1.5 * -LN(0.8) DAY)';
    } else {
      return null;
    }
    return this.wordBookRepository
      .createQueryBuilder('w')
      .where('w.userId = :userId', { userId })
      .andWhere(fitlerSql);
  }

  getWordBooksTomorrowQuery(userId: number, rememberMethod: RememberMethod) {
    let fitlerSql = '';
    if (rememberMethod === RememberMethod.POW) {
      fitlerSql =
        'DATE_ADD(CURDATE(), INTERVAL 2 DAY) > DATE_ADD(w.updated_at, INTERVAL POW(w.remembered_count, 1.5) DAY) and DATE_ADD(CURDATE(), INTERVAL 1 DAY) <= DATE_ADD(w.updated_at, INTERVAL POW(w.remembered_count, 1.5) DAY)';
    } else if (rememberMethod === RememberMethod.FC) {
      fitlerSql =
        'DATE_ADD(CURDATE(), INTERVAL 2 DAY) > DATE_ADD(updated_at, INTERVAL GREATEST(1, 1 + remembered_count*1.5 - hint_count * 0.1) * 1.5 * -LN(0.8) DAY) and DATE_ADD(CURDATE(), INTERVAL 1 DAY) <= DATE_ADD(updated_at, INTERVAL GREATEST(1, 1 + remembered_count*1.5 - hint_count * 0.1) * 1.5 * -LN(0.8) DAY)';
    } else {
      return null;
    }
    return this.wordBookRepository
      .createQueryBuilder('w')
      .where('w.userId = :userId', { userId })
      .andWhere(fitlerSql);
  }

  async rememberWordBook(userId: number, word: string, hintCount: number) {
    await this.wordBookRepository.increment(
      { userId, word },
      'rememberedCount',
      1,
    );
    await this.wordBookRepository.increment(
      { userId, word },
      'hintCount',
      hintCount,
    );
    await this.wordBookRepository.update(
      { userId, word },
      { currHintCount: hintCount },
    );
  }

  async delWordBook(userId: number, word: string) {
    return this.wordBookRepository.delete({
      userId,
      word,
    });
  }

  async existWordBook(userId: number, word: string) {
    return this.wordBookRepository.existsBy({
      userId,
      word,
    });
  }

  async addWordBook(
    userId: number,
    word: string,
    wordLang: Lang,
    from: string,
  ) {
    const exist = await this.wordBookRepository.existsBy({ userId, word });
    if (exist) {
      return false;
    }
    await this.wordBookRepository.insert({
      userId,
      word,
      wordLang,
      from,
      rememberedCount: 0,
      hintCount: 0,
    });
    return true;
  }
}
