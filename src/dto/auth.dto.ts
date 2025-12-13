import { IsEnum, IsOptional, Length, Matches, Max, Min } from 'class-validator';
import { ClientType } from 'src/constant/contant';
import { Lang } from 'src/enum/lang.enum';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';

export class AuthDto {
  userId!: string;
  clientType!: ClientType;
}

export class AuthProfileDto {
  nickname!: string;
  avatar?: string;
  rememberMethod!: RememberMethod;
  wordsLevel!: WordsLevel;
  useMinute!: number;
  multiSpeaker!: boolean;
  isWechat!: boolean;
  sayRatio!: number;
  reverseWordBookRatio?: number;
  targetRetention!: number;
  sourceLang!: Lang;
  targetLang!: Lang;
}

export class AuthProfileUpdateDto {
  @Length(1, 20)
  @Matches(/^[\u4e00-\u9fa5_a-zA-Z0-9]+$/)
  @IsOptional()
  nickname?: string;
  @IsOptional()
  rememberMethod?: RememberMethod;
  @IsOptional()
  useMinute?: number;
  @IsOptional()
  multiSpeaker?: boolean;
  @IsOptional()
  @IsEnum(WordsLevel)
  wordsLevel?: WordsLevel;
  @IsOptional()
  @Max(100)
  @Min(0)
  sayRatio?: number;
  @IsOptional()
  @Max(100)
  @Min(0)
  reverseWordBookRatio?: number;
  @IsOptional()
  @Max(95)
  @Min(80)
  targetRetention?: number;
  @IsOptional()
  @IsEnum(Lang)
  sourceLang?: Lang;
  @IsOptional()
  @IsEnum(Lang)
  targetLang?: Lang;
}

export class RegisterDto {
  publicKey!: string; // base64
}

export class ChallengeDto {
  account!: string;
}

export class IssueRefreshDto {
  account!: string;
  challengeId!: string;
  signature!: string; // base64
  deviceInfo?: string;
}

export class JwtPayload {
  sub!: string; // 用户ID
  userId!: string;
  type!: 'access';
  clientType!: ClientType;
}
