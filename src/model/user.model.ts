import { WordsLevel } from 'src/enum/words-level.enum';
import { RememberMethod } from 'src/enum/remember-method.enum';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  account!: string;

  @Column({ name: 'public_key' })
  publicKey!: string;

  @Column({ name: 'public_key_expired_at' })
  publicKeyExpiredAt!: Date;

  @Column({ name: 'device_info', type: 'text', nullable: true })
  deviceInfo?: string;

  @Column()
  nickname!: string;

  @Column()
  avatar?: string;

  @Column({ name: 'remember_method', type: 'enum', enum: RememberMethod })
  rememberMethod!: RememberMethod;

  @Column({ name: 'words_level' })
  wordsLevel!: WordsLevel;

  @Column({ name: 'use_minute' })
  useMinute!: number;

  @Column({ name: 'multi_speaker' })
  multiSpeaker!: boolean;

  @Column({ name: 'say_ratio' })
  sayRatio!: number;

  @Column({ name: 'target_retention' })
  targetRetention!: number;

  /**
   * 个人遗忘曲线
   */
  @Column({ name: 'curr_stability' })
  currStability?: number;

  @Column({ name: 'wechat_openid' })
  wechatOpenid?: string;

  @Column({ name: 'wechat_unionid' })
  wechatUnionid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
