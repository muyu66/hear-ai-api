import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { MyWordSummaryDto } from 'src/dto/my-word.dto';
import { Lang } from 'src/enum/lang.enum';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { User } from 'src/model/user.model';
import { WordBook } from 'src/model/word-book.model';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { AlgorithmService } from './algorithm.service';
import { AuthService } from './auth.service';

@Injectable()
export class MyWordService {
  private readonly logger = new Logger(MyWordService.name);

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(WordBook)
    private readonly wordBookRepository: Repository<WordBook>,
    private readonly algorithmService: AlgorithmService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getWordBookSummary(userId: number): Promise<MyWordSummaryDto> {
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
      nextRememberedAt: Between(
        dayjs().add(1, 'days').startOf('days').toDate(),
        dayjs().add(1, 'days').endOf('days').toDate(),
      ),
    });

    // 需要当前记忆的第一次单词
    const nowFirst = await this.wordBookRepository.findOne({
      where: {
        userId,
        nextRememberedAt: LessThanOrEqual(dayjs().toDate()),
      },
      order: {
        nextRememberedAt: 'ASC',
      },
    });

    return {
      totalCount,
      tomorrowCount,
      nowCount,
      todayDoneCount,
      stability:
        user.rememberMethod !== RememberMethod.ST
          ? nowFirst?.stability || 0
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
      nextRememberedAt: LessThanOrEqual(dayjs().toDate()),
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
        nextRememberedAt: LessThanOrEqual(dayjs().toDate()),
      },
      order: {
        nextRememberedAt: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async remember(
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
      nextRememberedAt: LessThanOrEqual(now),
    });
    if (!model) {
      this.logger.error(`用户无需复习 word=${word} userId=${userId}`);
      return;
    }

    const safeModel = this.algorithmService.handle(
      { word, hintCount, thinkingTime },
      model,
      user,
    );
    if (safeModel == null) {
      return;
    }
    const newModel = this.wordBookRepository.merge(model, safeModel);
    console.log('model', model);
    console.log('safeModel', safeModel);
    console.log('newModel', newModel);

    await this.wordBookRepository.save(newModel);
  }

  async badWordBook(userId: number, word: string) {
    await this.wordBookRepository.increment(
      {
        userId,
        word,
      },
      'badScore',
      1,
    );
  }

  async delete(userId: number, word: string) {
    return this.wordBookRepository.delete({
      userId,
      word,
    });
  }

  async exist(userId: number, word: string) {
    return this.wordBookRepository.existsBy({
      userId,
      word,
    });
  }

  async add(userId: number, word: string, wordLang: Lang, from: string) {
    const user = await this.authService.getUserProfile(userId);
    if (!user) {
      return false;
    }

    const exist = await this.wordBookRepository.existsBy({ userId, word });
    if (exist) {
      return false;
    }
    const model = new WordBook({
      userId,
      word,
      wordLang,
      from,
      rememberedCount: 0,
      hintCount: 0,
      currHintCount: 0,
      nextRememberedAt: undefined,
      lastRememberedAt: undefined,
      thinkingTime: 0,
      currThinkingTime: 0,
      badScore: 0,
    });

    const safeRememberModel = this.algorithmService.first(model, user);
    if (safeRememberModel == null) {
      return false;
    }

    const newModel = this.wordBookRepository.merge(model, safeRememberModel);
    console.log('newModel', newModel);
    console.log('safeRememberModel', safeRememberModel);
    console.log('model', model);
    await this.wordBookRepository.insert(newModel);
    return true;
  }
}
