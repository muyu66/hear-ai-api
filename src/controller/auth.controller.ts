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

  @Post('profile')
  async updateProfile(
    @Auth() auth: AuthDto,
    @Body() body: AuthProfileUpdateDto,
  ) {
    return this.authService.updateProfile(auth.userId, body);
  }

  @Get('profile')
  async getProfile(@Auth() auth: AuthDto): Promise<AuthProfileDto> {
    const user = await this.authService.getUserProfile(auth.userId);
    return <AuthProfileDto>{
      nickname: user.nickname,
      avatar: user.avatar,
      rememberMethod: user.rememberMethod,
      wordsLevel: user.wordsLevel,
      useMinute: user.useMinute,
      multiSpeaker: user.multiSpeaker,
      isWechat: user.wechatOpenid != null,
    };
  }

  @Public()
  @Post('sign_up')
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
  @Post('sign_up_wechat')
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
  @Post('sign_in')
  async signIn(
    @Body()
    body: {
      account: string;
      signatureBase64: string;
      timestamp: string;
    },
  ) {
    return this.authService.signIn(
      body.account,
      body.signatureBase64,
      body.timestamp,
    );
  }

  @Public()
  @Post('device_session')
  async createDeviceSession(
    @Body()
    body: {
      deviceRandomId: string;
      account: string;
      signatureBase64: string;
      timestamp: string;
    },
  ) {
    if (_.isEmpty(body.deviceRandomId) || body.deviceRandomId.length !== 32) {
      throw new BadRequestException('设备ID不合法');
    }
    return this.authService.createDeviceSession(
      body.deviceRandomId,
      body.account,
      body.signatureBase64,
      body.timestamp,
    );
  }

  @Public()
  @Get('device_session')
  async getTokenByDeviceSession(
    @Query('deviceSessionId') deviceSessionId: string,
  ) {
    if (_.isEmpty(deviceSessionId) || deviceSessionId.length !== 32) {
      throw new BadRequestException('设备会话ID不合法');
    }
    return this.authService.getTokenByDeviceSession(deviceSessionId);
  }
}
