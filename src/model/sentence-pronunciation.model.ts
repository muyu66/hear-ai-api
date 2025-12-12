import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class SentencePronunciation extends BaseEntity {
  @Column({ name: 'sentence_id' })
  sentenceId!: string;

  @Column()
  lang!: string;

  @Column()
  speaker!: string;

  @Column()
  pronunciation!: Buffer;

  @Column()
  slow!: boolean;
}
