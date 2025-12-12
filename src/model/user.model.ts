import { Lang } from 'src/enum/lang.enum';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.model';

@Entity()
export class User extends BaseEntity {
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

  @Column({ name: 'source_lang', enum: Lang })
  sourceLang!: Lang;

  @Column({ name: 'target_langs', enum: Lang, type: 'simple-json' })
  targetLangs!: Lang[];

  @Column({ name: 'wechat_openid', nullable: true })
  wechatOpenid?: string;

  @Column({ name: 'wechat_unionid', nullable: true })
  wechatUnionid?: string;

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}
