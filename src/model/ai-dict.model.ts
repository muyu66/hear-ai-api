import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity('ai_dict')
export class AiDict extends BaseEntity {
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

  @Column({
    type: 'varchar',
    length: 100,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'en_phonetic',
    nullable: true,
  })
  enPhonetic?: string;

  @Column({
    type: 'varchar',
    length: 100,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'zh_cn_phonetic',
    nullable: true,
  })
  zhCnPhonetic?: string;

  @Column({
    type: 'varchar',
    length: 100,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'ja_phonetic',
    nullable: true,
  })
  jaPhonetic?: string;

  @Column({
    type: 'varchar',
    length: 400,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'en_translation',
    nullable: true,
  })
  enTranslation?: string;

  @Column({
    type: 'varchar',
    length: 400,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'zh_cn_translation',
    nullable: true,
  })
  zhCnTranslation?: string;

  @Column({
    type: 'varchar',
    length: 400,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
    name: 'ja_translation',
    nullable: true,
  })
  jaTranslation?: string;

  @Column({ type: 'int', name: 'bad_score', unsigned: true, default: 0 })
  badScore!: number;

  constructor(partial: Partial<AiDict>) {
    super();
    Object.assign(this, partial);
  }
}
