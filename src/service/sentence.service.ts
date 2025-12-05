import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { range, sampleSize, shuffle } from 'lodash';
import { SentenceHistory } from 'src/model/sentence-history.model';
import { Sentence } from 'src/model/sentence.model';
import { User } from 'src/model/user.model';
import { Repository } from 'typeorm';

const MAX_RETRY = 5;

@Injectable()
export class SentenceService {
  private readonly logger = new Logger(SentenceService.name);

  constructor(
    @InjectRepository(Sentence)
    private sentenceRepository: Repository<Sentence>,
    @InjectRepository(SentenceHistory)
    private wordsHistoryRepository: Repository<SentenceHistory>,
  ) {}

  async getSentences(user: User) {
    const slicePool = await this.getNewSlicePool(user, 20);
    if (slicePool.length === 0) {
      return [];
    }
    return this.sentenceRepository
      .createQueryBuilder('w')
      .where('w.id IN (:...ids)', { ids: slicePool })
      .orderBy(`FIELD(w.id, ${slicePool.join(',')})`)
      .getMany();
  }

  async bad(wordsId: number) {
    await this.sentenceRepository.increment(
      {
        id: wordsId,
      },
      'badScore',
      1,
    );
  }

  // async cleanUserPool(userId: number) {
  //   await this.userWordsPoolRepository.delete({
  //     userId,
  //   });
  // }

  private async getPool(user: User, retry = 0): Promise<number[]> {
    // 生成randomMod范围内的randomCount个数字组成一个数组
    const randomMod = 100;
    const randomCount = 20;
    const randomSubs = sampleSize(shuffle(range(randomMod)), randomCount);

    // 获取N个随机句子
    const wordsModels = await this.sentenceRepository
      .createQueryBuilder()
      .where(`id % ${randomMod} in (${randomSubs.join(',')})`)
      .andWhere('level = :wordsLevel', {
        wordsLevel: user.wordsLevel,
      })
      .limit(400)
      .orderBy('bad_score', 'ASC')
      .getMany();

    // 去除用户已读的
    // const unreadWordsModels: Words[] = wordsModels.filter(
    //   (wordsModel) =>
    //     !this.bloomFilterService.hasRead(user.id + '', wordsModel.id + ''),
    // );

    const ids = wordsModels.map((v) => v.id);

    if (ids.length === 0) {
      // 获取多次还是没有新数据 ，则返回 []
      if (retry >= MAX_RETRY) {
        this.logger.error(`User ${user.id}: 没有更多数据了`);
        return [];
      }
      return this.getPool(user, retry + 1);
    }

    // 获取打乱后的 wordsIds 用于候选池
    return shuffle(ids);
  }

  //  获取新池子
  private async getNewSlicePool(
    user: User,
    sliceCount: number,
  ): Promise<number[]> {
    const newPool = await this.getPool(user);
    return newPool.slice(0, sliceCount);
  }

  async remember(
    wordsId: number,
    hintCount: number,
    thinkingTime: number,
    userId: number,
  ) {
    const history = await this.wordsHistoryRepository.findOneBy({
      userId,
      wordsId,
    });
    if (!history) {
      await this.wordsHistoryRepository.insert(
        new SentenceHistory({
          userId,
          wordsId,
          currHintCount: hintCount,
          hintCount,
          rememberedCount: 1,
          // 暂无计算的计划
          nextRememberedAt: new Date(),
          lastRememberedAt: new Date(),
          currThinkingTime: thinkingTime,
          thinkingTime,
        }),
      );
    } else {
      await this.wordsHistoryRepository.update(
        { userId, wordsId },
        {
          hintCount: history.hintCount + hintCount,
          currHintCount: hintCount,
          thinkingTime: history.thinkingTime + thinkingTime,
          currThinkingTime: thinkingTime,
          rememberedCount: history.rememberedCount + 1,
          // 注意顺序
          lastRememberedAt: history.nextRememberedAt,
          nextRememberedAt: new Date(),
        },
      );
    }
  }

  // private async getSlicePool(
  //   user: User,
  //   after: number,
  //   sliceCount: number,
  // ): Promise<number[]> {
  //   let pool: number[];

  //   //  获取池子
  //   const poolModel = await this.userWordsPoolRepository.findOne({
  //     where: { userId: user.id },
  //   });

  //   if (poolModel == null) {
  //     const newPool = await this.getPool(user);
  //     await this.userWordsPoolRepository.save({
  //       userId: user.id,
  //       pool: newPool,
  //       wordsLevel: user.wordsLevel,
  //     });
  //     pool = newPool;
  //   } else {
  //     pool = poolModel.pool;
  //     // 如果after是池子的最后一位，也就是用户看完了池子
  //     if (pool[pool.length - 1] === after || pool.length === 0) {
  //       const newPool = await this.getPool(user);
  //       await this.userWordsPoolRepository.update(
  //         {
  //           userId: user.id,
  //         },
  //         {
  //           pool: newPool,
  //           wordsLevel: user.wordsLevel,
  //         },
  //       );
  //       pool = newPool;
  //     } else {
  //       // 去除用户已读的
  //       pool = pool.filter((wordsId) => {
  //         return !this.bloomFilterService.hasRead(user.id + '', wordsId + '');
  //       });
  //     }
  //   }

  //   // 找到 n 的索引
  //   const index = pool.indexOf(after);
  //   // 如果找不到，返回整个数组
  //   if (index === -1) return pool.slice(0, sliceCount);
  //   // 返回从该索引开始到末尾的子数组, 不要当前索引
  //   return pool.slice(index + 1, index + 1 + sliceCount);
  // }
}
