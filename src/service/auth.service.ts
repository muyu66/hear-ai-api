import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { generateCuteNickname } from 'cute-nickname';
import dayjs from 'dayjs';
import type { StringValue } from 'ms';
import { lastValueFrom } from 'rxjs';
import { ClientType } from 'src/constant/contant';
import { AuthProfileUpdateDto, JwtPayload } from 'src/dto/auth.dto';
import { RememberMethod } from 'src/enum/remember-method.enum';
import { WordsLevel } from 'src/enum/words-level.enum';
import { UserLoginHistory } from 'src/model/user-login-history.model';
import { User } from 'src/model/user.model';
import { calculateActiveLevel } from 'src/tool/tool';
import nacl from 'tweetnacl';
import { Repository } from 'typeorm';
import { ConfigService } from './config.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly wxAppId: string;
  private readonly wxSecret: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserLoginHistory)
    private userLoginHistoryRepository: Repository<UserLoginHistory>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.wxAppId = this.configService.wxAppId ?? '';
    this.wxSecret = this.configService.wxSecret ?? '';
  }

  async createDeviceSession(
    deviceSessionId: string,
    account: string,
    signatureBase64: string,
    timestamp: string,
  ) {
    const { accessToken } = await this.signIn(
      account,
      signatureBase64,
      timestamp,
      'chrome',
      undefined,
      '14d',
    );
    await this.cacheManager.set(
      `deviceSessionId:${deviceSessionId}`,
      { accessToken },
      1000 * 60 * 5,
    );
  }

  async getTokenByDeviceSession(deviceSessionId: string) {
    const cached = await this.cacheManager.get<{
      accessToken: string;
    }>(`deviceSessionId:${deviceSessionId}`);
    return { accessToken: cached?.accessToken };
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
        sayRatio: body.sayRatio,
        reverseWordBookRatio: body.reverseWordBookRatio,
        targetRetention: body.targetRetention,
      },
    );
    // // 如果用户更新了 wordsLevel
    // if (body.wordsLevel != null && user.wordsLevel !== body.wordsLevel) {
    //   await this.wordsService.cleanUserPool(userId);
    // }
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
    account: string;
    publicKeyBase64: string;
    deviceInfo?: string;
    wechatOpenid?: string;
    wechatUnionid?: string;
  }) {
    return this.userRepository.save(
      new User({
        account: data.account,
        publicKey: data.publicKeyBase64,
        publicKeyExpiredAt: dayjs().add(30, 'day').toDate(),
        nickname: data.nickname ?? generateCuteNickname({ forcePrefix: true }),
        rememberMethod: RememberMethod.FSRS,
        wordsLevel: WordsLevel.EASY,
        deviceInfo: data.deviceInfo,
        useMinute: 5,
        multiSpeaker: true,
        sayRatio: 20,
        reverseWordBookRatio: 20,
        targetRetention: 90,
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
        deviceInfo,
      });
    }

    return this.verifyAndIssueAccessToken(
      user,
      signatureBase64,
      timestamp,
      'android',
    );
  }

  async linkWechat(code: string, userId: number) {
    if (code == null || code === '') {
      throw new BadRequestException('微信授权码不能为空');
    }
    const { openid } = await this.getWechatTokenByCode(code);
    if (openid == null || openid === '') {
      throw new UnauthorizedException('微信授权失败');
    }

    const user = await this.userRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    } else if (user.wechatOpenid != null) {
      throw new BadRequestException('微信已绑定其他账号');
    }

    await this.userRepository.update(
      {
        id: user.id,
      },
      {
        wechatOpenid: openid,
      },
    );
  }

  async signUpWechat(
    account: string,
    publicKeyBase64: string,
    signatureBase64: string,
    timestamp: string,
    code: string,
    deviceInfo?: string,
  ) {
    if (code == null || code === '') {
      throw new BadRequestException('微信授权码不能为空');
    }
    const { openid } = await this.getWechatTokenByCode(code);
    if (openid == null || openid === '') {
      throw new UnauthorizedException('微信授权失败');
    }

    let user = await this.userRepository.findOneBy({
      wechatOpenid: openid,
    });
    if (!user) {
      // 可能是权限太低了，取不到昵称和unionid
      user = await this.createUser({
        account,
        publicKeyBase64,
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

    return this.verifyAndIssueAccessToken(
      user,
      signatureBase64,
      timestamp,
      'android',
    );
  }

  async signIn(
    account: string,
    signatureBase64: string,
    timestamp: string,
    clientType: ClientType,
    deviceInfo?: string,
    expiresIn: StringValue = '1d',
  ) {
    const user = await this.userRepository.findOneBy({
      account,
    });
    if (!user) {
      throw new NotFoundException('账号不存在');
    }

    const res = this.verifyAndIssueAccessToken(
      user,
      signatureBase64,
      timestamp,
      clientType,
      expiresIn,
    );

    await this.afterSignIn(user.id, account, deviceInfo);
    return res;
  }

  private async afterSignIn(
    userId: number,
    account: string,
    deviceInfo?: string,
  ) {
    // 插入登录记录
    await this.userLoginHistoryRepository.insert(
      new UserLoginHistory(userId, account, deviceInfo),
    );
    // 计算登录间隔
    const loginHistories = await this.userLoginHistoryRepository.find({
      select: ['createdAt'],
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const activeLevel = calculateActiveLevel(
      loginHistories.map((h) => h.createdAt),
    );
    await this.userRepository.update(userId, { activeLevel });
  }

  private verifyAndIssueAccessToken(
    user: User,
    signatureBase64: string,
    timestamp: string,
    clientType: ClientType,
    expiresIn: StringValue = '1d',
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

    return this.issueAccessToken(user, clientType, expiresIn);
  }

  // 生成短期 accessToken
  private issueAccessToken(
    user: User,
    clientType: ClientType,
    expiresIn: StringValue = '1d',
  ) {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      type: 'access',
      clientType,
    };
    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn,
    });

    return { accessToken };
  }

  async getWechatTokenByCode(code: string) {
    // 拿 code 换 token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.wxAppId}&secret=${this.wxSecret}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await lastValueFrom(
      this.httpService.get<{
        access_token?: string;
        openid?: string;
        errcode: number;
      }>(tokenUrl),
    );
    if (tokenRes.data.errcode > 0) {
      throw new UnauthorizedException('微信授权失败');
    }
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
        errcode: number;
      }>(userInfoUrl),
    );
    if (userInfoRes.data.errcode > 0) {
      throw new UnauthorizedException('微信授权失败');
    }
    return {
      nickname: userInfoRes.data.nickname,
      avatar: userInfoRes.data.headimgurl,
      unionid: userInfoRes.data.unionid,
    };
  }
}
