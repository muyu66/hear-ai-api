import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';
import { Lang } from 'src/enum/lang.enum';

@Entity('ai_dict')
export class AiDict extends BaseEntity {
  @Column()
  word!: string;

  @Column()
  lang!: Lang;

  @Column({ type: 'simple-json' })
  phonetic!: string[];

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
