import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import _ from 'lodash';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { RememberModel } from 'src/interface/remember-model';
import { User } from 'src/model/user.model';
import { WordBook } from 'src/model/word-book.model';
import { AlgorithmFactory } from 'src/tool/algorithm/algorithm';
import { In, Repository } from 'typeorm';

@Injectable()
export class AlgorithmService {
  private readonly logger = new Logger(AlgorithmService.name);

  constructor(
    private readonly factory: AlgorithmFactory,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WordBook)
    private wordBookRepository: Repository<WordBook>,
  ) {}

  /**
   * 实时调度
   */
  handle(
    params: {
      word: string;
      hintCount: number;
      thinkingTime: number;
    },
    model: WordBook,
    user: User,
  ): RememberModel | null {
    const now = new Date();

    // 在计算之前赋值
    model.currHintCount = params.hintCount;
    model.hintCount += params.hintCount;
    model.currThinkingTime = params.thinkingTime;
    model.thinkingTime += params.thinkingTime;
    model.rememberedAt = now;
    model.rememberedCount += 1;

    // 计算
    const algorithm = this.factory.getAlgorithm(user.rememberMethod);
    if (!algorithm) {
      this.logger.error(`没有适配的算法 rememberMethod=${user.rememberMethod}`);
      return null;
    }
    const newModel = algorithm.handle(
      model,
      _.divide(user.targetRetention, 100),
      user.currStability,
    );
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
    return model;
  }

  /**
   * 异步训练
   */
  async train(skip: number = 0) {
    const users = await this.userRepository.find({
      where: {
        rememberMethod: In([RememberMethod.ARSS]),
      },
      take: 10,
      skip: skip,
    });
    if (users.length === 0) {
      return;
    }
    for (const user of users) {
      const history = await this.wordBookRepository.find({
        where: {
          userId: user.id,
        },
        order: {
          rememberedAt: 'DESC',
        },
        take: 200,
      });
      for (const algorithm of this.factory.getAlgorithms()) {
        if (!algorithm.supportTrain) continue;
        const trainRes = algorithm.train(history, user.currStability || 1.0);
        await this.userRepository.update(user.id, {
          currStability: trainRes.currentS,
          memoryCurve: trainRes.memoryCurve,
        });
        this.logger.debug(
          `userId=${user.id}的遗忘曲线训练完成, currStability=${trainRes.currentS}, memoryCurveLen=${trainRes.memoryCurve.length}`,
        );
      }
    }
    await this.train(skip + users.length);
    return;
  }
}
