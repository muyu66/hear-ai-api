import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  handle(model: WordBook, user: User): RememberModel | null {
    const algorithm = this.factory.getAlgorithm(user.rememberMethod);
    if (!algorithm) {
      this.logger.error(`没有适配的算法 rememberMethod=${user.rememberMethod}`);
      return null;
    }
    return algorithm.handle(
      model,
      _.divide(user.targetRetention, 100),
      user.currStability,
    );
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
