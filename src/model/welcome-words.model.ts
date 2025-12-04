import { Lang } from 'src/enum/lang.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class WelcomeWords {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  words!: string;

  @Column({ name: 'words_lang', type: 'enum', enum: Lang })
  wordsLang!: Lang;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
