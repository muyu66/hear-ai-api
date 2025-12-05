import { Injectable, Logger } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { User } from 'src/model/user.model';
import { AlgorithmFactory } from 'src/tool/algorithm/algorithm';

@Injectable()
export class AlgorithmService {
  private readonly logger = new Logger(AlgorithmService.name);

  constructor(private readonly factory: AlgorithmFactory) {}

  /**
   * 复习
   */
  handle(
    params: {
      word: string;
      hintCount: number;
      thinkingTime: number;
    },
    model: RememberModel,
    user: User,
  ): Partial<RememberModel> {
    // 在计算之前赋值
    model.currHintCount = params.hintCount;
    model.hintCount += params.hintCount;
    model.currThinkingTime = params.thinkingTime;
    model.thinkingTime += params.thinkingTime;
    model.rememberedCount += 1;

    // 计算
    const copyModel = { ...model };
    const algorithm = this.factory.getAlgorithm(user.rememberMethod);
    const newModel = algorithm.handle(copyModel, user);

    // 在计算之后赋值
    newModel.lastRememberedAt = new Date();

    return newModel;
  }

  /**
   * 第一次
   */
  first(model: RememberModel, user: User): Partial<RememberModel> {
    // 计算
    const copyModel = { ...model };
    const algorithm = this.factory.getAlgorithm(user.rememberMethod);
    return algorithm.handle(copyModel, user);
  }
}
