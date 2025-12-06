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

    // 计算
    const algorithm = this.factory.getAlgorithm(user.rememberMethod);
    const card = algorithm.build(
      model.rememberedCount === 0 ? undefined : model,
    );
    const algoParams = algorithm.buildParams(user);
    const grade = algorithm.buildGrade(model);
    const newCard = algorithm.handle(grade, card, algoParams, new Date());
    return algorithm.resolve(newCard);
  }
}
