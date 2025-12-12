import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class DictPronunciation extends BaseEntity {
  @Column({ name: 'dict_id' })
  dictId!: string;

  @Column()
  word!: string;

  @Column()
  lang!: string;

  @Column()
  speaker!: string;

  @Column()
  pronunciation!: Buffer;

  @Column()
  slow!: boolean;
}
