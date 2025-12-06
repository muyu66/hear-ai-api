import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class SentenceHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'words_id' })
  wordsId!: number;

  @Column({ name: 'curr_hint_count' })
  currHintCount!: number;

  @Column({ name: 'remembered_count' })
  rememberedCount!: number;

  @Column({ name: 'next_remembered_at' })
  nextRememberedAt!: Date;

  @Column({ name: 'last_remembered_at', nullable: true })
  lastRememberedAt?: Date;

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @Column({ name: 'thinking_time' })
  thinkingTime!: number;

  @Column({ name: 'curr_thinking_time' })
  currThinkingTime!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(params?: {
    userId: number;
    wordsId: number;
    currHintCount: number;
    rememberedCount: number;
    nextRememberedAt: Date;
    lastRememberedAt?: Date;
    hintCount: number;
    thinkingTime: number;
    currThinkingTime: number;
  }) {
    if (params) {
      this.userId = params.userId;
      this.wordsId = params.wordsId;
      this.currHintCount = params.currHintCount;
      this.rememberedCount = params.rememberedCount;
      this.nextRememberedAt = params.nextRememberedAt;
      this.lastRememberedAt = params.lastRememberedAt;
      this.hintCount = params.hintCount;
      this.thinkingTime = params.thinkingTime;
      this.currThinkingTime = params.currThinkingTime;
    }
  }
}
