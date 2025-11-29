import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProfileUpdateDto } from 'src/dto/auth.dto';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { User } from 'src/model/user.model';
import nacl from 'tweetnacl';
import { Repository } from 'typeorm';
import { WordsService } from './words.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly wordsService: WordsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async updateProfile(userId: number, body: AuthProfileUpdateDto) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user == null) {
      throw new NotFoundException('用户不存在');
    }
    await this.userRepository.update(
      {
        id: userId,
      },
      {
        nickname: body.nickname,
        rememberMethod: body.rememberMethod,
        useMinute: body.useMinute,
        multiSpeaker: body.multiSpeaker,
        wordsLevel: body.wordsLevel,
      },
    );
    // 如果用户更新了 wordsLevel
    if (body.wordsLevel != null && user.wordsLevel !== body.wordsLevel) {
      await this.wordsService.cleanUserPool(userId);
    }
  }

  async getUserProfile(userId: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user == null) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async signUp(
    account: string,
    publicKeyBase64: string,
    signatureBase64: string,
    timestamp: string,
    deviceInfo?: string,
  ) {
    let user = await this.userRepository.findOneBy({
      account,
    });
    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({
          account,
          publicKey: publicKeyBase64,
          nickname: '匿名用户',
          rememberMethod: RememberMethod.POW,
          wordsLevel: WordsLevel.EASY,
          deviceInfo,
          useMinute: 5,
          multiSpeaker: true,
        }),
      );
    }

    return this.issueAccessToken(user, signatureBase64, timestamp);
  }

  async signIn(account: string, signatureBase64: string, timestamp: string) {
    const user = await this.userRepository.findOneBy({
      account,
    });
    if (!user) {
      throw new NotFoundException('账号不存在');
    }

    return this.issueAccessToken(user, signatureBase64, timestamp);
  }

  private issueAccessToken(
    user: User,
    signatureBase64: string,
    timestamp: string,
  ) {
    const publicKey = Buffer.from(user.publicKey, 'base64');
    const signature = Buffer.from(signatureBase64, 'base64');

    // 验证时间合法性
    const tsNumber = Number(timestamp);
    if (isNaN(tsNumber)) throw new UnauthorizedException('无效的时间戳');

    const now = Date.now();
    // 15分钟有效期
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    if (Math.abs(now - tsNumber) > FIFTEEN_MINUTES) {
      throw new UnauthorizedException('请求已过期');
    }

    const msg = Buffer.from(`${timestamp}`, 'utf8');
    const valid = nacl.sign.detached.verify(
      msg,
      signature,
      new Uint8Array(publicKey),
    );
    if (!valid) throw new UnauthorizedException('无效的签名');

    // 生成短期 accessToken
    const accessToken = this.jwtService.sign(
      { userId: user.id, type: 'access' },
      { expiresIn: '1d' },
    );

    return { accessToken };
  }
}
