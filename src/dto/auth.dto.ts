import { IsOptional, Length } from 'class-validator';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';

export class AuthDto {
  userId!: number;
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
