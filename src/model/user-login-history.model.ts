import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class UserLoginHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column()
  account!: string;

  @Column({ name: 'device_info', type: 'text', nullable: true })
  deviceInfo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(userId: number, account: string, deviceInfo?: string) {
    this.userId = userId;
    this.account = account;
    this.deviceInfo = deviceInfo;
  }
}
