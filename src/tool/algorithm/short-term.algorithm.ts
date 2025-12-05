// short-term-algorithm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

/**
 * 短期突击记忆算法（Short-Term Intensive Recall）
 * 适用于 24 小时内需高准确率回忆的场景（如考前突击、面试准备）
 */
@Injectable()
export class ShortTermAlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(ShortTermAlgorithmService.name);
  readonly type: string = 'st';

  private readonly intervalsInMinutes = [0, 5, 15, 30, 60, 60 * 3, 60 * 24];
  private readonly doneInterval = 3; // 一轮学习完成的间隔

  handle(model: RememberModel): Partial<RememberModel> {
    const now = new Date();
    const quality = 5 - model.currHintCount;

    // 提取当前阶段
    let stageIndex = model.shortStageIndex ?? 0;

    // 判断学习完成
    if (stageIndex >= this.intervalsInMinutes.length) {
      return {
        nextRememberedAt: dayjs(now).add(this.doneInterval, 'days').toDate(),
        shortStageIndex: stageIndex,
      };
    }

    // 自定义成功标准
    const isSuccess = quality < 3;

    if (isSuccess) {
      // 阶段推进
      stageIndex = Math.min(stageIndex + 1, this.intervalsInMinutes.length);
    } else {
      // 失败回退阶段（强化困难材料）
      stageIndex = Math.max(stageIndex - 1, 0);
    }

    // 完成逻辑判断
    if (stageIndex >= this.intervalsInMinutes.length) {
      return {
        nextRememberedAt: dayjs(now).add(this.doneInterval, 'days').toDate(),
        shortStageIndex: stageIndex,
      };
    }

    const interval = this.intervalsInMinutes[stageIndex];
    const nextRememberedAt = dayjs(now).add(interval, 'minute').toDate();

    return {
      nextRememberedAt,
      shortStageIndex: stageIndex,
    };
  }
}
