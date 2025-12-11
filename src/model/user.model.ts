import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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
   * 反转单词本比率
   * 比如之前是看英文想释义，现在是看释义想英文
   */
  @Column({ name: 'reverse_word_book_ratio' })
  reverseWordBookRatio!: number;

  /**
   * 活跃度等级 0-100
   * 默认50
   */
  @Column({ name: 'active_level' })
  activeLevel!: number;

  @Column({ name: 'wechat_openid', nullable: true })
  wechatOpenid?: string;

  @Column({ name: 'wechat_unionid', nullable: true })
  wechatUnionid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(params?: {
    account: string;
    publicKey: string;
    publicKeyExpiredAt: Date;
    nickname: string;
    rememberMethod: RememberMethod;
    wordsLevel: WordsLevel;
    useMinute: number;
    multiSpeaker: boolean;
    sayRatio: number;
    targetRetention: number;
    reverseWordBookRatio: number;
    activeLevel: number;
    wechatOpenid?: string;
    wechatUnionid?: string;
    deviceInfo?: string;
    avatar?: string;
  }) {
    if (params) {
      this.account = params.account;
      this.publicKey = params.publicKey;
      this.publicKeyExpiredAt = params.publicKeyExpiredAt;
      this.nickname = params.nickname;
      this.avatar = params.avatar;
      this.rememberMethod = params.rememberMethod;
      this.wordsLevel = params.wordsLevel;
      this.useMinute = params.useMinute;
      this.multiSpeaker = params.multiSpeaker;
      this.sayRatio = params.sayRatio;
      this.targetRetention = params.targetRetention;
      this.reverseWordBookRatio = params.reverseWordBookRatio;
      this.activeLevel = params.activeLevel;
      this.wechatOpenid = params.wechatOpenid;
      this.wechatUnionid = params.wechatUnionid;
      this.deviceInfo = params.deviceInfo;
    }
  }
}
