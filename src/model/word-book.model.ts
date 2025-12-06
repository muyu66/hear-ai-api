import { Lang } from 'src/enum/lang.enum';
import { RememberModel } from 'src/interface/remember-model';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WordBook implements RememberModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(params?: {
    userId: number;
    word: string;
    wordLang: Lang;
    from: string;
    badScore: number;
    rememberedCount: number;
    nextRememberedAt: Date;
    lastRememberedAt?: Date;
    currHintCount: number;
    hintCount: number;
    thinkingTime: number;
    currThinkingTime: number;
    fsrsStability?: number;
    fsrsDifficulty?: number;
    fsrsLapses?: number;
    fsrsLearningSteps?: number;
    fsrsState?: number;
    sm2Efactor?: number;
    sm2SuccessRememberedCount?: number;
  }) {
    if (params) {
      this.userId = params.userId;
      this.word = params.word;
      this.wordLang = params.wordLang;
      this.from = params.from;
      this.badScore = params.badScore;
      this.rememberedCount = params.rememberedCount;
      this.nextRememberedAt = params.nextRememberedAt;
      this.lastRememberedAt = params.lastRememberedAt;
      this.currHintCount = params.currHintCount;
      this.hintCount = params.hintCount;
      this.thinkingTime = params.thinkingTime;
      this.currThinkingTime = params.currThinkingTime;
      this.fsrsStability = params.fsrsStability;
      this.fsrsDifficulty = params.fsrsDifficulty;
      this.fsrsLapses = params.fsrsLapses;
      this.fsrsLearningSteps = params.fsrsLearningSteps;
      this.fsrsState = params.fsrsState;
      this.sm2Efactor = params.sm2Efactor;
      this.sm2SuccessRememberedCount = params.sm2SuccessRememberedCount;
    }
  }
}
