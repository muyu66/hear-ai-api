import { Lang } from 'src/enum/lang.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Sentence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  source!: string;

  @Column({ name: 'source_lang', type: 'enum', enum: Lang })
  sourceLang!: Lang;

  @Column()
  target!: string;

  @Column({ name: 'target_lang', type: 'enum', enum: Lang })
  targetLang!: Lang;

  @Column({ type: 'enum', enum: WordsLevel })
  level!: WordsLevel;

  @Column()
  md5!: string;

  @Column({ name: 'bad_score' })
  badScore!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
