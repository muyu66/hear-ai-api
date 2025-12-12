import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class UserLoginHistory extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  account!: string;

  @Column({ name: 'device_info', type: 'text', nullable: true })
  deviceInfo?: string;

  constructor(partial: Partial<UserLoginHistory>) {
    super();
    Object.assign(this, partial);
  }
}
