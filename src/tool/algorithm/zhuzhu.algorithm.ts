import { Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

import dayjs from 'dayjs';
import { User } from 'src/model/user.model';
import _ from 'lodash';

interface Card {
  nextRememberedAt: Date;
  lastRememberedAt?: Date;
  currThinkingTime?: number;
  thinkingTime?: number;
  rememberedCount: number;
}

interface Params {
  targetR: number;
  activeLevel: number;
  dailyPlanUseMinute: number; // 每天计划使用分钟数
}

type Grade = 1 | 2 | 3 | 4;

@Injectable()
export class ZhuzhuAlgorithmService implements IAlgorithm<Grade, Card, Params> {
  readonly type: string = 'zhuzhu';

  build(model?: RememberModel): Card {
    if (!model) {
      return {
        currThinkingTime: 0,
        thinkingTime: 0,
        lastRememberedAt: undefined,
        nextRememberedAt: new Date(),
        rememberedCount: 0,
      };
    }
    return {
      nextRememberedAt: model.nextRememberedAt,
      lastRememberedAt: model.lastRememberedAt,
      currThinkingTime: model.currThinkingTime,
      thinkingTime: model.thinkingTime,
      rememberedCount: model.rememberedCount,
    };
  }

  buildParams(user: User): Params {
    return {
      targetR: user.targetRetention / 100,
      activeLevel: user.activeLevel / 10,
      dailyPlanUseMinute: user.useMinute,
    };
  }

  buildGrade(model: RememberModel): Grade {
    return (() => {
      if (model.currHintCount === 0) return 4;
      if (model.currHintCount === 1) return 3;
      if (model.currHintCount === 2) return 2;
      return 1;
    })();
  }

  resolve(card: Card): Partial<RememberModel> {
    return {
      nextRememberedAt: card.nextRememberedAt,
      lastRememberedAt: card.lastRememberedAt,
      rememberedCount: card.rememberedCount,
    };
  }

  handle(grade: Grade, card: Card, params: Params, now?: Date): Card {
    const nowDate = now ?? new Date();

    // 基础间隔
    let intervalMinutes = 5;
    const fixValue = 60 * 24 * 3;

    // 思考时间调节
    const factorThinkingTime = this.adjustForThinkingTime(card);
    const valueThinkingTime = 0.45 * fixValue * factorThinkingTime;
    intervalMinutes += valueThinkingTime;

    // 用户活跃度调节
    const factorActiveLevel = this.adjustForActiveLevel(params);
    const valueActiveLevel = 0.2 * fixValue * factorActiveLevel;
    intervalMinutes += valueActiveLevel;

    // 经验曲线调节
    const factorExperience = this.adjustForExperience(card);
    const valueExperience = 0.05 * fixValue * factorExperience;
    intervalMinutes += valueExperience;

    // 分数影响
    const factorGrade = this.adjustForGrade(grade);
    const valueGrade = 0.3 * fixValue * factorGrade;
    intervalMinutes += valueGrade;

    // 最低安全间隔、最高间隔
    const minMinutes = params.dailyPlanUseMinute / 2;
    const maxMinutes = 60 * 24 * 365;
    intervalMinutes = _.clamp(intervalMinutes, minMinutes, maxMinutes);

    // 构造结果
    const next = dayjs(nowDate).add(intervalMinutes, 'minutes').toDate();

    // console.log({
    //   params,
    //   card,
    //   valueThinkingTime,
    //   valueActiveLevel,
    //   valueExperience,
    //   valueGrade,
    // });

    return {
      nextRememberedAt: next,
      lastRememberedAt: card.nextRememberedAt ?? nowDate,
      rememberedCount: card.rememberedCount + 1,
    };
  }

  private adjustForGrade(grade: Grade): number {
    const GRADE_FACTORS: Record<Grade, number> = {
      1: 0.5, // 显著缩短
      2: 0.85, // 轻微缩短
      3: 1.15, // 轻微延长
      4: 1.9, // 显著延长
    };
    return GRADE_FACTORS[grade] ?? 1;
  }

  private adjustForThinkingTime(card: Card) {
    if (card.rememberedCount === 0) return 1;

    const avgThinkingTime = (card.thinkingTime ?? 0) / card.rememberedCount;
    if (avgThinkingTime === 0) return 1;
    // ratio >1 变差， <1 变好
    const ratio = (card.currThinkingTime ?? 0) / avgThinkingTime;

    // 指数调节提升灵敏性
    return Math.pow(ratio, -0.7);
  }

  private adjustForActiveLevel(params: Params) {
    const activeLevel = params.activeLevel / 10;
    return _.clamp(1 + 0.15 * Math.tanh(0.4 * (activeLevel - 5)), 0.8, 1.2);
  }

  // 经验曲线，不依赖复杂理论
  private adjustForExperience(card: Card): number {
    const c = card.rememberedCount;
    if (c <= 0) return 1;
    return 1 + Math.log(c + 1) * 0.25;
  }
}
