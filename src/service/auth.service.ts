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
import { HttpService } from '@nestjs/axios';
import { ConfigService } from './config.service';
import { lastValueFrom } from 'rxjs';
import dayjs from 'dayjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly wxAppId: string;
  private readonly wxSecret: string;

  constructor(
    private readonly wordsService: WordsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.wxAppId = this.configService.wxAppId ?? '';
    this.wxSecret = this.configService.wxSecret ?? '';
  }

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

  async createUser(data: {
    nickname?: string;
    account?: string;
    publicKeyBase64?: string;
    deviceInfo?: string;
    wechatOpenid?: string;
    wechatUnionid?: string;
  }) {
    return this.userRepository.save(
      this.userRepository.create({
        account: data.account,
        publicKey: data.publicKeyBase64,
        publicKeyExpiredAt: dayjs().add(30, 'day').toDate(),
        nickname: data.nickname ?? '匿名用户',
        rememberMethod: RememberMethod.POW,
        wordsLevel: WordsLevel.EASY,
        deviceInfo: data.deviceInfo,
        useMinute: 5,
        multiSpeaker: true,
        wechatOpenid: data.wechatOpenid,
        wechatUnionid: data.wechatUnionid,
      }),
    );
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
      user = await this.createUser({
        account,
        publicKeyBase64,
        nickname: '匿名用户',
        deviceInfo,
      });
    }

    return this.verifyAndIssueAccessToken(user, signatureBase64, timestamp);
  }

  async signUpWechat(
    account: string,
    publicKeyBase64: string,
    signatureBase64: string,
    timestamp: string,
    code: string,
    deviceInfo?: string,
  ) {
    if (code == null) {
      throw new UnauthorizedException('微信授权码不能为空');
    }

    const { openid } = await this.getWechatTokenByCode(code);
    let user = await this.userRepository.findOneBy({
      wechatOpenid: openid,
    });
    if (!user) {
      // 可能是权限太低了，取不到昵称和unionid
      user = await this.createUser({
        account,
        publicKeyBase64,
        nickname: '微信用户',
        deviceInfo,
        wechatOpenid: openid,
        wechatUnionid: undefined,
      });
    } else {
      // 换新私钥公钥了，要更新
      user = await this.userRepository.save({
        id: user.id,
        account,
        publicKey: publicKeyBase64,
        publicKeyExpiredAt: dayjs().add(30, 'day').toDate(),
        deviceInfo,
      });
    }

    return this.verifyAndIssueAccessToken(user, signatureBase64, timestamp);
  }

  async signIn(account: string, signatureBase64: string, timestamp: string) {
    const user = await this.userRepository.findOneBy({
      account,
    });
    if (!user) {
      throw new NotFoundException('账号不存在');
    }

    return this.verifyAndIssueAccessToken(user, signatureBase64, timestamp);
  }

  private verifyAndIssueAccessToken(
    user: User,
    signatureBase64: string,
    timestamp: string,
  ) {
    const publicKey = Buffer.from(user.publicKey, 'base64');
    const signature = Buffer.from(signatureBase64, 'base64');

    if (dayjs().isAfter(user.publicKeyExpiredAt)) {
      throw new UnauthorizedException('公钥已过期');
    }

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

    return this.issueAccessToken(user);
  }

  // 生成短期 accessToken
  private issueAccessToken(user: User) {
    const accessToken = this.jwtService.sign(
      { userId: user.id, type: 'access' },
      { expiresIn: '1d' },
    );

    return { accessToken };
  }

  async getWechatTokenByCode(code: string) {
    // 拿 code 换 token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.wxAppId}&secret=${this.wxSecret}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await lastValueFrom(
      this.httpService.get<{ access_token: string; openid: string }>(tokenUrl),
    );
    return {
      accessToken: tokenRes.data.access_token,
      openid: tokenRes.data.openid,
    };
  }

  async getWechatUserInfo(accessToken: string, openid: string) {
    const userInfoUrl = `https://api.weixin.qq.com/sns/oauth2/userinfo?access_token=${accessToken}&openid=${openid}`;
    const userInfoRes = await lastValueFrom(
      this.httpService.get<{
        nickname: string;
        headimgurl: string;
        unionid: string;
      }>(userInfoUrl),
    );
    return {
      nickname: userInfoRes.data.nickname,
      avatar: userInfoRes.data.headimgurl,
      unionid: userInfoRes.data.unionid,
    };
  }
}
