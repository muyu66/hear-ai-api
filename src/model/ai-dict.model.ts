import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ai_dict')
export class AiDict {
  @PrimaryColumn()
  word: string;

  @Column({ type: 'int', name: 'bad_score', unsigned: true, default: 0 })
  badScore: number;

  @Column({
    type: 'varchar',
    length: 200,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  phonetic: string;

  @Column({
    type: 'varchar',
    length: 400,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  translation: string;

  constructor(
    word: string,
    phonetic: string,
    translation: string,
    badScore: number = 0,
  ) {
    this.word = word;
    this.phonetic = phonetic;
    this.translation = translation;
    this.badScore = badScore;
  }
}
