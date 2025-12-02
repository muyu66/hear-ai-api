import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WordsHistory {
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

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
