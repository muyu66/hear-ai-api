import { IsOptional, Length } from 'class-validator';
import { ClientType } from 'src/constant/contant';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';

export class AuthDto {
  userId!: number;
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
}

export class AuthProfileUpdateDto {
  @Length(1, 20)
  @IsOptional()
  nickname?: string;
  @IsOptional()
  rememberMethod?: RememberMethod;
  @IsOptional()
  useMinute?: number;
  @IsOptional()
  multiSpeaker?: boolean;
  @IsOptional()
  wordsLevel?: WordsLevel;
}

export class RegisterDto {
  publicKey: string; // base64
}

export class ChallengeDto {
  account: string;
}

export class IssueRefreshDto {
  account: string;
  challengeId: string;
  signature: string; // base64
  deviceInfo?: string;
}

export class JwtPayload {
  sub: number; // 用户ID
  userId: number;
  type: 'access';
  clientType: ClientType;
}
