import { Lang } from 'src/enum/lang.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WordBook {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column()
  word!: string;

  @Column({ name: 'word_lang', type: 'enum', enum: Lang })
  wordLang!: Lang;

  @Column({ name: 'remembered_at' })
  rememberedAt: Date;

  @Column({ name: 'remembered_count' })
  rememberedCount!: number;

  @Column({ name: 'hint_count' })
  hintCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
