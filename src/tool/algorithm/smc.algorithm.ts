import { Injectable, Logger } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { User } from 'src/model/user.model';
import { IAlgorithm } from './algorithm';
import { clamp } from 'lodash';

const BUCKETS = 100;

// 官方 SM-18 初始化稳定性示例（可按你的业务微调）
const INITIAL_STABILITY: number[] = [
  ...(Array(20).fill(1.0) as number[]), // 0-19
  ...(Array(30).fill(2.0) as number[]), // 20-49
  ...(Array(30).fill(4.0) as number[]), // 50-79
  ...(Array(20).fill(6.0) as number[]), // 80-99
];

// 示例二维表 SInc[difficulty_bucket][grade]，grade 0..5
const SINC_TABLE: number[][] = Array.from({ length: BUCKETS }, (_, bucket) => {
  const base = [0, 1.5, 2.8, 5.0, 9.0, 15.0];
  // 每个 bucket 可以微调
  return base.map((v) => v * (1 + (99 - bucket) / 100));
});

@Injectable()
export class SMCAlgorithmService implements IAlgorithm {
  private readonly logger = new Logger(SMCAlgorithmService.name);
  readonly type: string = 'smc';
  private readonly P_TABLE = Array.from({ length: BUCKETS }, (_, i) => {
    if (i < 20) return 0.45;
    if (i < 50) return 0.65;
    if (i < 80) return 0.85;
    return 1.1;
  });
  private readonly dayMs = 86400 * 1000;
  private readonly MIN_FIRST_INTERVAL_DAYS = 1; // 首次复习最小间隔保护

  handle(model: RememberModel, user: User): Partial<RememberModel> {
    const grade = clamp(5 - model.currHintCount, 0, 5);
    let difficulty = clamp(model.difficulty ?? 50, 1, 99);
    const lastRememberedAt = model.lastRememberedAt;
    const rememberedCount = model.rememberedCount;
    const stability = model.stability ?? 0;
    const targetR = user.targetRetention / 100;
    const now = new Date();
    const bucket = this.getBucket(difficulty);
    const p = this.P_TABLE[bucket];

    const hasLast = lastRememberedAt != null;
    const daysElapsed = hasLast
      ? Math.max(0.1, (now.getTime() - lastRememberedAt.getTime()) / this.dayMs)
      : 0;

    const actualR =
      rememberedCount > 0 && hasLast
        ? this.retrievability(daysElapsed, stability, p)
        : 0;

    // 1. 更新 Difficulty
    if (rememberedCount > 0) {
      const w = rememberedCount > 30 ? 0.06 : 0.12;
      difficulty = clamp(difficulty * (1 - w) + (1 - actualR) * 100 * w, 1, 99);
    }

    // 2. 更新 Stability
    let newS: number;

    if (rememberedCount === 0) {
      // 首次学习
      const init = INITIAL_STABILITY[bucket];
      // 首次学习不应该给太大，折中给0.7
      const multiplier = 0.7;
      newS = Math.max(0.5, init * multiplier); // 首次最少给半天
      this.logger.debug(`首次学习, newS=${newS}`);
    } else if (rememberedCount === 1) {
      // 再次学习
      const init = INITIAL_STABILITY[bucket];
      const multiplier =
        grade === 5 ? 1.8 : grade === 4 ? 1.2 : grade === 3 ? 0.7 : 0.4;
      newS = Math.max(1, init * multiplier); // 首次最少给1天
      this.logger.debug(`再次学习, newS=${newS}`);
    } else if (grade < 3) {
      // 答错惩罚，平滑衰减
      newS = stability * clamp(0.9 - 0.8 * actualR, 0.3, 0.99);
      this.logger.debug(`答错, newS=${newS}`);
    } else {
      // 答对增长，使用 SInc 表 + surpriseFactor
      const expectedDays =
        hasLast &&
        model.nextRememberedAt &&
        model.nextRememberedAt.getTime() > lastRememberedAt.getTime()
          ? Math.max(
              0.1,
              (model.nextRememberedAt.getTime() - lastRememberedAt.getTime()) /
                this.dayMs,
            )
          : stability;

      const expectedR = this.retrievability(expectedDays, stability, p);
      const deltaR = actualR - expectedR;
      const surpriseFactor = (() => {
        if (deltaR > 0.15) return 1 + 2.0 * deltaR; // 大幅超预期 → 暴奖
        if (deltaR > 0.05) return 1 + 0.8 * deltaR; // 小幅超预期 → 轻奖
        if (deltaR < -0.1) return Math.max(0.7, 0.9 + deltaR); // 显著低于预期 → 重罚
        return 1.0;
      })();

      const baseFactor = SINC_TABLE[bucket][grade];
      newS = stability * Math.max(1, baseFactor) * surpriseFactor;

      this.logger.debug(`答对, newS=${newS}`);
    }

    // 3. 情绪修正
    newS = newS * this.moodMultiplier(user.activeLevel / 10);

    // 4. 计算下次间隔，使用 newS！
    const nextInterval = newS * Math.pow(-Math.log(targetR), 1 / p);

    return {
      difficulty,
      stability: newS,
      nextRememberedAt: new Date(now.getTime() + nextInterval * this.dayMs),
    };
  }

  private getBucket(d: number) {
    return clamp(Math.floor(d), 0, BUCKETS - 1);
  }

  private retrievability(daysElapsed: number, stability: number, p: number) {
    if (!isFinite(daysElapsed) || daysElapsed < 0) daysElapsed = 0;
    if (!isFinite(stability) || stability <= 0) {
      return daysElapsed === 0 ? 1 : 0;
    }
    const ratio = Math.max(0, daysElapsed / stability);
    return Math.exp(-Math.pow(ratio, p));
  }

  private moodMultiplier(score: number = 5.5): number {
    return clamp(1 + 0.43 * Math.tanh(1.2 * (score - 5.5)), 0.68, 1.45);
  }
}
