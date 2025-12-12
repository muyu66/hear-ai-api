import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class SentenceHistory extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'sentence_id' })
  sentenceId!: string;

  @Column({ name: 'curr_hint_count' })
  currHintCount!: number;

  @Column({ name: 'remembered_count' })
  rememberedCount!: number;

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @Column({ name: 'thinking_time' })
  thinkingTime!: number;

  @Column({ name: 'curr_thinking_time' })
  currThinkingTime!: number;

  constructor(partial: Partial<SentenceHistory>) {
    super();
    Object.assign(this, partial);
  }
}
