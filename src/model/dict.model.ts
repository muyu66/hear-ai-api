import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('dict')
export class Dict {
  @PrimaryColumn()
  word!: string;

  @Column({ type: 'int', name: 'bad_score', unsigned: true, default: 0 })
  badScore!: number;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  phonetic?: string;

  @Column({
    type: 'text',
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  definition?: string;

  @Column({
    type: 'varchar',
    length: 400,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  translation?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  pos?: string;

  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  collins?: string;

  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  oxford?: string;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  tag?: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  bnc?: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  frq?: number;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  exchange?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  detail?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_0900_ai_ci',
  })
  audio?: string;
}
