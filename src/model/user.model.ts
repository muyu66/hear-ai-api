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
   * 个人遗忘曲线 稳定值
   * 默认值 1
   */
  @Column({ name: 'curr_stability', nullable: true })
  currStability?: number;

  /**
   * 个人遗忘曲线 30天变化
   */
  @Column({ name: 'memory_curve', nullable: true, type: 'json' })
  memoryCurve?: number[];

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
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(
    account: string,
    publicKey: string,
    publicKeyExpiredAt: Date,
    nickname: string,
    rememberMethod: RememberMethod,
    wordsLevel: WordsLevel,
    useMinute: number,
    multiSpeaker: boolean,
    sayRatio: number,
    targetRetention: number,
    reverseWordBookRatio: number,
    wechatOpenid?: string,
    wechatUnionid?: string,
    currStability?: number,
    memoryCurve?: number[],
    deviceInfo?: string,
    avatar?: string,
  ) {
    this.account = account;
    this.publicKey = publicKey;
    this.publicKeyExpiredAt = publicKeyExpiredAt;
    this.nickname = nickname;
    this.avatar = avatar;
    this.rememberMethod = rememberMethod;
    this.wordsLevel = wordsLevel;
    this.useMinute = useMinute;
    this.multiSpeaker = multiSpeaker;
    this.sayRatio = sayRatio;
    this.targetRetention = targetRetention;
    this.reverseWordBookRatio = reverseWordBookRatio;
    this.wechatOpenid = wechatOpenid;
    this.wechatUnionid = wechatUnionid;
    this.currStability = currStability;
    this.memoryCurve = memoryCurve;
    this.deviceInfo = deviceInfo;
  }
}
