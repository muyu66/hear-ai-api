import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import _ from 'lodash';
import { WordBookSummaryDto } from 'src/dto/word-book.dto';
import { Lang } from 'src/enum/lang.enum';
import { WelcomeWords } from 'src/model/welcome-words.model';
import { WordBook } from 'src/model/word-book.model';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { AlgorithmService } from './algorithm.service';
import { AuthService } from './auth.service';
import { User } from 'src/model/user.model';
import { RememberMethod } from 'src/enum/remember-method.enum';

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
    private readonly algorithmService: AlgorithmService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    const user = await this.userRepository.findOneByOrFail({ id: userId });

    const totalCount = await this.wordBookRepository.countBy({
      userId,
    });

    const nowCount = await this.getWordBookNow(userId);

    const todayDoneCount = await this.wordBookRepository.countBy({
      userId,
      lastRememberedAt: Between(
        dayjs().startOf('days').toDate(),
        dayjs().endOf('days').toDate(),
      ),
    });

    const tomorrowCount = await this.wordBookRepository.countBy({
      userId,
      rememberedAt: Between(
        dayjs().add(1, 'days').startOf('days').toDate(),
        dayjs().add(1, 'days').endOf('days').toDate(),
      ),
    });
    return {
      totalCount,
      tomorrowCount,
      nowCount,
      todayDoneCount,
      currStability:
        user.rememberMethod === RememberMethod.ARSS
          ? (user.currStability ?? 1)
          : undefined,
    };
  }

  /**
   * 获取此时的复习量
   * @param userId
   * @returns
   */
  async getWordBookNow(userId: number): Promise<number> {
    return await this.wordBookRepository.countBy({
      userId,
      rememberedAt: LessThanOrEqual(dayjs().toDate()),
    });
  }

  /**
   * 获取此时的复习内容
   * @param userId
   * @param limit
   * @returns
   */
  async getWordBooks(
    userId: number,
    limit: number,
    offset: number,
  ): Promise<WordBook[]> {
    return await this.wordBookRepository.find({
      where: {
        userId,
        rememberedAt: LessThanOrEqual(dayjs().toDate()),
      },
      take: limit,
      skip: offset,
    });
  }

  async rememberWordBook(
    userId: number,
    word: string,
    hintCount: number,
    thinkingTime: number,
  ) {
    const now = new Date();

    const user = await this.authService.getUserProfile(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const model = await this.wordBookRepository.findOneBy({
      userId,
      word,
      rememberedAt: LessThanOrEqual(now),
    });
    if (!model) {
      this.logger.error(`用户无需复习 word=${word} userId=${userId}`);
      return;
    }

    // 在计算之前赋值
    model.currHintCount = hintCount;
    model.hintCount += hintCount;
    model.currThinkingTime = thinkingTime;
    model.thinkingTime += thinkingTime;
    model.rememberedAt = now;
    model.rememberedCount += 1;

    // 计算
    const newModel = this.algorithmService.handle(model, user);
    if (newModel == null) {
      this.logger.error(
        `算法计算失败 wordBookId=${model.id} rememberMethod=${user.rememberMethod}`,
      );
      // 回滚最基础算法
      model.rememberedAt = dayjs(now).add(1, 'day').toDate();
    }

    // 在计算之后赋值, 以此指定某些安全字段可以覆盖
    // 注意顺序
    model.lastRememberedAt = model.rememberedAt;
    model.rememberedAt = newModel!.rememberedAt;
    model.easeFactor = newModel!.easeFactor;
    model.repetitionZeroHintCount = newModel!.repetitionZeroHintCount;

    await this.wordBookRepository.save(model);
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
      currHintCount: 0,
      rememberedAt: new Date(),
      lastRememberedAt: new Date(),
      repetitionZeroHintCount: 0,
      easeFactor: 2.5,
      thinkingTime: 0,
      currThinkingTime: 0,
    });
    return true;
  }
}
