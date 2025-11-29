import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BloomFilterShard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shard_id' })
  shardId!: number;

  @Column('longtext')
  data!: string;
}
