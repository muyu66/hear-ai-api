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

  @Column({ nullable: true })
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
   * 默认值 1
   */
  @Column({ name: 'curr_stability', nullable: true })
  currStability?: number;

  /**
   * 反转单词本比率
   * 比如之前是看英文想释义，现在是看释义想英文
   */
  @Column({ name: 'reverse_word_book_ratio' })
  reverseWordBookRatio!: number;

  @Column({ name: 'wechat_openid', nullable: true })
  wechatOpenid?: string;

  @Column({ name: 'wechat_unionid', nullable: true })
  wechatUnionid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
