import { RememberModel } from 'src/interface/remember-model';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WordsHistory implements RememberModel {
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

  @Column({ name: 'remembered_at' })
  rememberedAt!: Date;

  @Column({ name: 'last_remembered_at' })
  lastRememberedAt!: Date;

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @Column({ name: 'repetition_zero_hint_count' })
  repetitionZeroHintCount!: number;

  @Column({ name: 'ease_factor' })
  easeFactor!: number;

  @Column({ name: 'thinking_time' })
  thinkingTime!: number;

  @Column({ name: 'curr_thinking_time' })
  currThinkingTime!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
