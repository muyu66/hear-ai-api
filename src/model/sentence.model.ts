import { WordsLevel } from 'src/enum/words-level.enum';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class Sentence extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 60,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  en!: string;

  @Column({
    type: 'varchar',
    length: 60,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'zh_cn',
    nullable: true,
  })
  zhCn?: string;

  @Column({
    type: 'varchar',
    length: 60,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    nullable: true,
  })
  ja?: string;

  @Column({ type: 'enum', enum: WordsLevel })
  level!: WordsLevel;

  @Column()
  md5!: string;

  @Column({ name: 'bad_score' })
  badScore!: number;

  constructor(partial: Partial<Sentence>) {
    super();
    Object.assign(this, partial);
  }
}
