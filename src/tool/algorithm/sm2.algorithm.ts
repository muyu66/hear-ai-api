import { Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

import dayjs from 'dayjs';
import { supermemo, SuperMemoGrade, SuperMemoItem } from 'supermemo';

interface Card extends SuperMemoItem {
  nextRememberedAt: Date;
  lastRememberedAt?: Date;
  totalCount: number;
}

@Injectable()
export class SM2AlgorithmService
  implements IAlgorithm<SuperMemoGrade, Card, any>
{
  readonly type: string = 'sm2';

  build(model?: RememberModel): Card {
    if (!model) {
      return {
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        lastRememberedAt: undefined,
        nextRememberedAt: new Date(),
        totalCount: 0,
      };
    }
    return {
      nextRememberedAt: model.nextRememberedAt,
      lastRememberedAt: model.lastRememberedAt,
      interval: dayjs().diff(model.lastRememberedAt, 'days'),
      repetition: model.sm2SuccessRememberedCount || 0,
      efactor: model.sm2Efactor || 2.5,
      totalCount: model.rememberedCount,
    };
  }

  buildParams() {
    return {};
  }

  buildGrade(model: RememberModel): SuperMemoGrade {
    return (() => {
      if (model.currHintCount === 0) return 4;
      if (model.currHintCount === 1) return 3;
      if (model.currHintCount === 2) return 2;
      return 1;
    })();
  }

  resolve(card: Card): Partial<RememberModel> {
    return {
      sm2Efactor: card.efactor,
      nextRememberedAt: card.nextRememberedAt,
      lastRememberedAt: card.lastRememberedAt,
      sm2SuccessRememberedCount: card.repetition,
      rememberedCount: card.totalCount,
    };
  }

  handle(grade: SuperMemoGrade, card: Card, params: any, now?: Date): Card {
    const nowDate = now ?? new Date();
    const { interval, repetition, efactor } = supermemo(card, grade);

    card.lastRememberedAt = card.nextRememberedAt ?? nowDate;
    card.nextRememberedAt = dayjs(nowDate).add(interval, 'day').toDate();
    card.efactor = efactor;
    card.interval = interval;
    card.repetition = repetition;
    card.totalCount += 1;
    return card;
  }
}
