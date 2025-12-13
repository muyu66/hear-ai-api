import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import _ from 'lodash';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { Public } from 'src/decorator/public.decorator';
import {
  AuthDto,
  AuthProfileDto,
  AuthProfileUpdateDto,
} from 'src/dto/auth.dto';
import { AuthService } from 'src/service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ClientAllowed('android')
  @Post('profile')
  async updateProfile(
    @Auth() auth: AuthDto,
    @Body() body: AuthProfileUpdateDto,
  ) {
    return this.authService.updateProfile(auth.userId, body);
  }

  @ClientAllowed('chrome', 'android')
  @Get('profile')
  async getProfile(@Auth() auth: AuthDto): Promise<AuthProfileDto> {
    const user = await this.authService.getUserProfile(auth.userId);
    return {
      nickname: user.nickname,
      avatar: user.avatar,
      rememberMethod: user.rememberMethod,
      wordsLevel: user.wordsLevel,
      useMinute: user.useMinute,
      multiSpeaker: user.multiSpeaker,
      isWechat: user.wechatOpenid != null,
      sayRatio: user.sayRatio,
      reverseWordBookRatio: user.reverseWordBookRatio,
      targetRetention: user.targetRetention,
      sourceLang: user.sourceLang,
      targetLang: user.targetLang,
    } satisfies AuthProfileDto;
  }

  @ClientAllowed('android')
  @Post('link-wechat')
  async linkWechat(
    @Body()
    body: {
      code: string;
    },
    @Auth() auth: AuthDto,
  ) {
    return this.authService.linkWechat(body.code, auth.userId);
  }

  @Public()
  @Post('sign-up')
  async signUp(
    @Body()
    body: {
      account: string;
      publicKeyBase64: string;
      signatureBase64: string;
      timestamp: string;
      deviceInfo?: string;
    },
  ) {
    return this.authService.signUp(
      body.account,
      body.publicKeyBase64,
      body.signatureBase64,
      body.timestamp,
      body.deviceInfo,
    );
  }

  @Public()
  @Post('sign-up-wechat')
  async signUpWechat(
    @Body()
    body: {
      account: string;
      publicKeyBase64: string;
      signatureBase64: string;
      timestamp: string;
      code: string;
      deviceInfo?: string;
    },
  ) {
    return this.authService.signUpWechat(
      body.account,
      body.publicKeyBase64,
      body.signatureBase64,
      body.timestamp,
      body.code,
      body.deviceInfo,
    );
  }

  @Public()
  @Post('sign-in')
  async signIn(
    @Body()
    body: {
      account: string;
      signatureBase64: string;
      timestamp: string;
      deviceInfo?: string;
    },
  ) {
    return this.authService.signIn(
      body.account,
      body.signatureBase64,
      body.timestamp,
      'android',
      body.deviceInfo,
    );
  }

  @ClientAllowed('android')
  @Post('device-session')
  async createDeviceSession(
    @Body()
    body: {
      deviceSessionId: string;
      account: string;
      signatureBase64: string;
      timestamp: string;
    },
  ) {
    if (_.isEmpty(body.deviceSessionId) || body.deviceSessionId.length !== 32) {
      throw new BadRequestException('设备会话ID不合法');
    }
    return this.authService.createDeviceSession(
      body.deviceSessionId,
      body.account,
      body.signatureBase64,
      body.timestamp,
    );
  }

  @Public()
  @Get('device-session')
  async getTokenByDeviceSession(
    @Query('deviceSessionId') deviceSessionId: string,
  ) {
    if (_.isEmpty(deviceSessionId) || deviceSessionId.length !== 32) {
      throw new BadRequestException('设备会话ID不合法');
    }
    return this.authService.getTokenByDeviceSession(deviceSessionId);
  }
}
