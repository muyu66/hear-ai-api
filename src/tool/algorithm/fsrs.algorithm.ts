import { Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { IAlgorithm } from './algorithm';

import dayjs from 'dayjs';
import { User } from 'src/model/user.model';
import {
  Card,
  createEmptyCard,
  fsrs,
  FSRSParameters,
  generatorParameters,
  Grade,
  Rating,
  State,
} from 'ts-fsrs';

@Injectable()
export class FsrsAlgorithmService
  implements IAlgorithm<Grade, Card, FSRSParameters>
{
  readonly type: string = 'fsrs';

  build(model?: RememberModel): Card {
    if (!model) {
      return createEmptyCard();
    }
    if (model.fsrsStability == null || model.fsrsStability === 0) {
      // 可能是别的算法切换过来的
      return createEmptyCard();
    }
    return {
      due: model.nextRememberedAt,
      last_review: model.lastRememberedAt,
      stability: model.fsrsStability || 0,
      difficulty: model.fsrsDifficulty || 0,
      elapsed_days: dayjs().diff(model.lastRememberedAt, 'days'),
      scheduled_days: dayjs(model.nextRememberedAt).diff(
        model.lastRememberedAt,
        'days',
      ),
      reps: model.rememberedCount,
      lapses: model.fsrsLapses || 0,
      state: model.fsrsState || State.Review,
      learning_steps: model.fsrsLearningSteps || 0,
    };
  }

  buildParams(user: User): FSRSParameters {
    return generatorParameters({
      enable_fuzz: true,
      enable_short_term: false,
      request_retention: user.targetRetention / 100,
    });
  }

  buildGrade(model: RememberModel): Grade {
    return (() => {
      if (model.currHintCount === 0) return Rating.Easy;
      if (model.currHintCount === 1) return Rating.Good;
      if (model.currHintCount === 2) return Rating.Hard;
      return Rating.Again;
    })();
  }

  resolve(card: Card): Partial<RememberModel> {
    return {
      fsrsStability: card.stability,
      fsrsDifficulty: card.difficulty,
      nextRememberedAt: card.due,
      lastRememberedAt: card.last_review,
      rememberedCount: card.reps,
      fsrsLapses: card.lapses,
      fsrsState: card.state,
      fsrsLearningSteps: card.learning_steps,
    };
  }

  handle(grade: Grade, card: Card, params: FSRSParameters, now?: Date): Card {
    console.log(card);
    const engine = fsrs(params);
    const { card: newCard } = engine.next(card, now ?? new Date(), grade);
    console.log(newCard);
    return newCard;
  }
}
