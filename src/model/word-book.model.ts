import { Lang } from 'src/enum/lang.enum';
import { RememberModel } from 'src/interface/remember-model';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class WordBook extends BaseEntity implements RememberModel {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  word!: string;

  @Column({ name: 'word_lang', type: 'enum', enum: Lang })
  wordLang!: Lang;

  /**
   * 单词来源
   */
  @Column()
  from!: string;

  @Column({ name: 'bad_score' })
  badScore!: number;

  @Column({ name: 'remembered_count' })
  rememberedCount!: number;

  @Column({ name: 'next_remembered_at' })
  nextRememberedAt!: Date;

  @Column({ name: 'last_remembered_at', nullable: true })
  lastRememberedAt?: Date;

  @Column({ name: 'curr_hint_count' })
  currHintCount!: number;

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @Column({ name: 'thinking_time' })
  thinkingTime!: number;

  @Column({ name: 'curr_thinking_time' })
  currThinkingTime!: number;

  @Column({ name: 'fsrs_stability', nullable: true })
  fsrsStability?: number;

  @Column({ name: 'fsrs_difficulty', nullable: true })
  fsrsDifficulty?: number;

  @Column({ name: 'fsrs_lapses', nullable: true })
  fsrsLapses?: number;

  @Column({ name: 'fsrs_learning_steps', nullable: true })
  fsrsLearningSteps?: number;

  @Column({ name: 'fsrs_state', nullable: true })
  fsrsState?: number;

  @Column({ name: 'sm2_efactor', nullable: true })
  sm2Efactor?: number;

  @Column({ name: 'sm2_success_remembered_count', nullable: true })
  sm2SuccessRememberedCount?: number;

  constructor(partial: Partial<WordBook>) {
    super();
    Object.assign(this, partial);
  }
}
