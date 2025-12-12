import { Lang } from 'src/enum/lang.enum';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class WelcomeWords extends BaseEntity {
  @Column()
  words!: string;

  @Column({ name: 'words_lang', type: 'enum', enum: Lang })
  wordsLang!: Lang;
}
