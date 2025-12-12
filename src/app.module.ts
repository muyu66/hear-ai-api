import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config.module';
import { AddController } from './controller/add.controller';
import { AuthController } from './controller/auth.controller';
import { DictController } from './controller/dict.controller';
import { MyWordController } from './controller/my-word.controller';
import { SentenceController } from './controller/sentence.controller';
import { SplashController } from './controller/splash.controller';
import { AuthGuard } from './guard/auth.guard';
import { ClientGuard } from './guard/client.guard';
import { AiDict } from './model/ai-dict.model';
import { DictPronunciation } from './model/dict-pronunciation.model';
import { SentenceHistory } from './model/sentence-history.model';
import { SentencePronunciation } from './model/sentence-pronunciation.model';
import { Sentence } from './model/sentence.model';
import { UserLoginHistory } from './model/user-login-history.model';
import { User } from './model/user.model';
import { WelcomeWords } from './model/welcome-words.model';
import { WordBook } from './model/word-book.model';
import { AddService } from './service/add.service';
import { AlgorithmService } from './service/algorithm.service';
import { AppService } from './service/app.service';
import { AuthService } from './service/auth.service';
import { ConfigService } from './service/config.service';
import { DictPronunciationService } from './service/dict-pronunciation.service';
import { DictService } from './service/dict.service';
import { MyWordService } from './service/my-word.service';
import { SentencePronunciationService } from './service/sentence-pronunciation.service';
import { SentenceService } from './service/sentence.service';
import { AiRequest } from './tool/ai-request';
import { AlgorithmModule } from './tool/algorithm/algorithm.module';
import { VoiceAliRequest } from './tool/voice/voice-ali-request';
import { VoiceMurfRequest } from './tool/voice/voice-murf-request';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AlgorithmModule,
    CacheModule.register(),
    HttpModule,
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'mysql',
          host: configService.mysqlHost,
          port: configService.mysqlPort,
          username: configService.mysqlUsername,
          password: configService.mysqlPassword,
          database: configService.mysqlDatabase,
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature([
      Sentence,
      User,
      WordBook,
      WelcomeWords,
      SentenceHistory,
      AiDict,
      UserLoginHistory,
      SentencePronunciation,
      DictPronunciation,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          global: true,
          secret: configService.jwtSecret,
        };
      },
    }),
  ],
  controllers: [
    SentenceController,
    DictController,
    AuthController,
    AddController,
    MyWordController,
    SplashController,
  ],
  providers: [
    DictPronunciationService,
    DictService,
    MyWordService,
    AlgorithmService,
    AuthService,
    ConfigService,
    SentenceService,
    AppService,
    AddService,
    VoiceMurfRequest,
    VoiceAliRequest,
    SentencePronunciationService,
    AiRequest,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientGuard,
    },
  ],
})
export class AppModule {}
