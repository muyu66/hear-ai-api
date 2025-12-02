import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import _ from 'lodash';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

/*
ASM+（Adaptive SM+） 是在 SM-2 基础上深度优化的新一代自适应记忆调度算法。
它保留了 SM-2 的核心思想，同时引入动态初始间隔、平滑难度调整、历史提示稳定性评估和失败软重置机制，显著提升个性化与鲁棒性。
*/
@Injectable()
export class ASMPlusAlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(ASMPlusAlgorithmService.name);
  readonly type: string = 'asmplus';
  readonly supportTrain = false;
  constructor() {}

  train(): number {
    throw new Error('Method not implemented.');
  }

  handle(sourceModel: RememberModel): RememberModel | null {
    if (!sourceModel) return null;

    const model = _.cloneDeep(sourceModel);

    // 1. 计算本次回忆质量（0=完美，5=完全遗忘）
    const quality = Math.min(model.currHintCount, 5); // 0~5

    // 2. 更新全局统计
    model.rememberedCount += 1;
    model.hintCount += model.currHintCount;

    // 3. 计算近期平均提示率（过去5次，避免噪声）
    const recentAttempts = Math.min(model.rememberedCount, 5);
    const avgHintRate =
      recentAttempts > 0 ? model.hintCount / model.rememberedCount : quality;

    // 4. 判断是否成功（你定义：<3 提示为成功）
    const isSuccess = quality < 3;

    // 5. 当前时间（假设复习发生在 rememberedAt）
    const now = new Date(model.rememberedAt);

    if (!isSuccess) {
      // ===== 失败处理：软重置 =====
      // 不完全清零，保留部分历史（防止挫败感）
      model.repetitionZeroHintCount = Math.max(
        0,
        model.repetitionZeroHintCount - 2,
      );

      // 下次复习：1天（可微调）
      model.rememberedAt = dayjs(now).add(1, 'day').toDate();

      // EF 轻微惩罚（不是原始SM-2的不更新，而是温和下调）
      const efDelta = -0.15; // 固定小幅下降
      model.easeFactor = Math.max(1.3, model.easeFactor + efDelta);
    } else {
      // ===== 成功处理 =====
      model.repetitionZeroHintCount += 1;

      let nextIntervalDays: number;

      if (model.rememberedCount === 1) {
        // 首次学习：根据质量动态设定初始间隔
        // quality=0 → 2天；quality=2 → 1天
        nextIntervalDays = Math.max(1, 2 - quality);
      } else if (model.repetitionZeroHintCount === 1) {
        // 第一次成功复习（从失败中恢复）
        nextIntervalDays = 1;
      } else if (model.repetitionZeroHintCount === 2) {
        // 第二次连续成功：基础间隔
        nextIntervalDays = 5 + (2 - quality); // quality=0 → 7天；quality=2 → 5天
      } else {
        // 长期记忆阶段：自适应间隔
        const baseInterval = dayjs(now).diff(model.lastRememberedAt, 'day');

        // 调整因子：结合 easeFactor 和近期稳定性
        const stabilityFactor = 1.0 - 0.1 * avgHintRate; // 提示越多，增长越慢
        const adjustedEF = model.easeFactor * stabilityFactor;

        nextIntervalDays = Math.round(baseInterval * adjustedEF);

        // 设置合理上下限
        nextIntervalDays = Math.min(
          Math.max(nextIntervalDays, 1),
          365, // 最多1年
        );
      }

      model.rememberedAt = dayjs(now).add(nextIntervalDays, 'day').toDate();

      // 更新 EF：更平滑的公式
      // quality=0 → +0.1；quality=1 → 0；quality=2 → -0.1
      const efDelta = 0.1 - 0.1 * quality;
      model.easeFactor = Math.max(1.3, model.easeFactor + efDelta);
    }

    // 6. 更新上次复习时间
    model.lastRememberedAt = now;

    return model;
  }
}
