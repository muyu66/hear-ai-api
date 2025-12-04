import { Injectable, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import _ from 'lodash';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

/*
Adaptive Recall-Sensitive Scheduling (ARSS)
自适应回忆敏感调度算法

ARSS 是一种轻量级、数据驱动的间隔重复调度算法，专为“全局拟合 + 单词级微调”场景设计。
它在 FSRS 记忆模型基础上，仅依赖单次复习记录实现个性化调度，兼顾科学性与工程效率。
*/
@Injectable()
export class ARSSAlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(ARSSAlgorithmService.name);
  readonly type: string = 'arss';
  readonly supportTrain = true;
  constructor() {}

  /**
   * 基于单次 RememberModel 对复习时间做单词级微调
   */
  handle(
    sourceModel: RememberModel,
    targetRetention: number,
    currentStability: number,
  ): RememberModel | null {
    if (targetRetention <= 0 || targetRetention >= 1) {
      throw new Error('targetRetention must be between 0 and 1 (e.g., 0.9)');
    }

    if (!sourceModel) return null;

    const model = _.cloneDeep(sourceModel);

    // 1. 基础间隔（天）
    const baseIntervalDays = 9 * currentStability * (1 / targetRetention - 1);

    // 2. 从单次模型提取回忆质量
    const quality = this.mapHintCountToQuality(model.currHintCount); // [0, 1]

    // 3. 引入连续成功次数作为信心加成（可选但推荐）
    const confidenceBonus = Math.min(model.repetitionZeroHintCount * 0.1, 0.3); // 最多 +0.3

    // 4. 计算调整因子 RAF
    // quality=1（完美）→ raf=1.3；quality=0（失败）→ raf=0.6
    let raf = 0.6 + 0.7 * quality + confidenceBonus;
    raf = Math.max(0.5, Math.min(1.5, raf)); // clamp to [0.5, 1.5]

    // 5. 应用微调
    const adjustedInterval = baseIntervalDays * raf;
    const daysToAdd = Math.max(1, Math.round(adjustedInterval));

    model.rememberedAt = dayjs(model.rememberedAt)
      .add(daysToAdd, 'day')
      .toDate();
    return model;
  }

  // 辅助函数：将 currHintCount 映射到 [0,1] 质量评分
  mapHintCountToQuality(hintCount: number): number {
    // 线性映射：0→1.0, 1→0.8, 2→0.6, ≥3→0.3
    if (hintCount === 0) return 1.0;
    if (hintCount === 1) return 0.8;
    if (hintCount === 2) return 0.6;
    return 0.3; // 失败
  }

  train(
    history: RememberModel[],
    initialStability: number = 1.0, // 新词默认 S=1 天
  ): { currentS: number; memoryCurve: number[] } {
    if (history.length === 0)
      return { currentS: initialStability, memoryCurve: [] };

    // 按时间排序
    const sorted = [...history].sort(
      (a, b) => a.rememberedAt.getTime() - b.rememberedAt.getTime(),
    );

    let currentS = initialStability;
    let lastReviewTime = sorted[0].createdAt.getTime();

    for (const review of sorted) {
      const t =
        (review.rememberedAt.getTime() - lastReviewTime) /
        (24 * 60 * 60 * 1000); // 天数
      if (t <= 0) continue;

      // 计算复习时的 Retrievability
      const R = 1 / (1 + t / (9 * currentS));

      // 将 currHintCount 映射为 rating（0~3）
      const rating = this.mapHintCountToRating(review.currHintCount);

      // 更新 Stability
      currentS = this.updateStability(currentS, R, rating);
      lastReviewTime = review.rememberedAt.getTime();
    }
    const memoryCurve = this.generateMemoryCurve(currentS, 30);

    return { currentS, memoryCurve };
  }

  mapHintCountToRating(hintCount: number): number {
    if (hintCount >= 3) return 0; // 失败
    if (hintCount === 2) return 1; // 困难
    if (hintCount === 1) return 2; // 良好
    return 3; // 完美
  }

  updateStability(S: number, R: number, rating: number): number {
    // 使用 FSRS 简化更新规则
    const w = [0.4, 0.6, 1.0, 1.5]; // 针对 rating 0~3 的 S 增长因子（可调）
    const factor = w[Math.min(rating, 3)];
    return S * (1 + factor * (1 - R));
  }

  // 根据 S 生成遗忘曲线数据
  generateMemoryCurve(S: number, days = 30): number[] {
    const P = Math.log(2) / (9 * S); // 遗忘速率
    const data: number[] = [];
    for (let t = 0; t <= days; t++) {
      data.push(Math.exp(-P * t));
    }
    return data;
  }
}
