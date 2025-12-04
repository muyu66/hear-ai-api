import { Lang } from 'src/enum/lang.enum';
import { RememberModel } from 'src/interface/remember-model';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
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

  @Column({ name: 'remembered_at' })
  rememberedAt!: Date;

  @Column({ name: 'last_remembered_at' })
  lastRememberedAt!: Date;

  @Column({ name: 'curr_hint_count' })
  currHintCount!: number;

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
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
