import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import _ from 'lodash';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

/**
SM-2 是间隔重复（Spaced Repetition）领域最具影响力的经典算法，由 Piotr Woźniak 于 1980 年代提出。
它通过动态调整复习间隔和“易度因子”（Ease Factor），帮助用户在遗忘临界点高效巩固记忆。

局限：对单次表现敏感、初始间隔固定、失败惩罚过重，难以适应个体差异。
 */
@Injectable()
export class SM2AlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(SM2AlgorithmService.name);
  readonly type: string = 'sm2';
  readonly supportTrain = false;

  constructor() {}

  train(): number {
    throw new Error('Method not implemented.');
  }

  handle(sourceModel: RememberModel): RememberModel | null {
    if (!sourceModel) return null;

    const model = _.cloneDeep(sourceModel);

    // SM-2算法
    if (model.currHintCount >= 3) {
      // 复习失败
      model.repetitionZeroHintCount = 0;
      model.rememberedAt = dayjs(model.rememberedAt).add(1, 'day').toDate();
      // EF 不变
    } else {
      // 复习成功
      model.repetitionZeroHintCount += 1;

      if (model.repetitionZeroHintCount === 1) {
        model.rememberedAt = dayjs(model.rememberedAt).add(1, 'day').toDate();
      } else if (model.repetitionZeroHintCount === 2) {
        model.rememberedAt = dayjs(model.rememberedAt).add(6, 'day').toDate();
      } else {
        const interval = Math.round(
          dayjs(model.rememberedAt).diff(model.lastRememberedAt, 'day') *
            model.easeFactor,
        );
        model.rememberedAt = dayjs(model.rememberedAt)
          .add(interval, 'day')
          .toDate();
      }

      const quality = model.currHintCount >= 5 ? 5 : model.currHintCount;
      // 仅成功时更新 EF
      model.easeFactor = Math.max(
        1.3,
        model.easeFactor + 0.1 - quality * (0.08 + quality * 0.02),
      );
    }

    return model;
  }
}
