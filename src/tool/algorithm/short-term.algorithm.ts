// short-term-algorithm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import _ from 'lodash';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

/**
 * 短期突击记忆算法（Short-Term Intensive Recall）
 * 适用于 24 小时内需高准确率回忆的场景（如考前突击、面试准备）
 * 调度节奏：0min → 10min → 30min → 1h → 3h → 1d
 */
@Injectable()
export class ShortTermAlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(ShortTermAlgorithmService.name);
  readonly type: string = 'st';
  readonly supportTrain = false;

  // 预设复习间隔（单位：分钟），共 6 个阶段（含初始学习）
  private readonly intervalsInMinutes = [0, 10, 30, 60, 180, 1440]; // 最后一步为 1 天

  constructor() {}

  train(): { currentS: number; memoryCurve: number[] } {
    throw new Error('Method not implemented.');
  }

  handle(sourceModel: RememberModel): RememberModel | null {
    if (!sourceModel) return null;

    const model = _.cloneDeep(sourceModel);
    const quality = Math.min(model.currHintCount, 5); // 0=完美，5=完全遗忘
    const now = new Date(model.rememberedAt); // 当前复习发生时间

    // 更新全局计数
    model.rememberedCount += 1;
    model.hintCount += model.currHintCount;
    model.lastRememberedAt = now;

    // 判断是否成功（<3 提示视为成功）
    const isSuccess = quality < 3;

    if (!isSuccess) {
      // ❌ 失败：5 分钟后重试（强制高频暴露）
      model.rememberedAt = dayjs(now).add(5, 'minute').toDate();
      // 不清零连续成功，但也不推进阶段（保持当前或回退）
      model.repetitionZeroHintCount = Math.max(
        0,
        model.repetitionZeroHintCount - 1,
      );
    } else {
      // ✅ 成功：推进到下一阶段
      model.repetitionZeroHintCount += 1;

      // 计算下一阶段索引（从 rememberedCount 推断当前阶段）
      // 第1次复习 → 阶段1（10min），第2次 → 阶段2（30min）...
      const nextStageIndex = Math.min(
        model.rememberedCount, // 第 n 次复习对应 intervals[n]
        this.intervalsInMinutes.length - 1,
      );

      const nextIntervalMinutes = this.intervalsInMinutes[nextStageIndex];
      model.rememberedAt = dayjs(now)
        .add(nextIntervalMinutes, 'minute')
        .toDate();
    }

    // easeFactor 在短期模式中意义不大，可固定或微调（此处保持不变）
    // 也可用于后续判断是否转入长期模式

    return model;
  }
}
