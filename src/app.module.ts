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
import { WordController } from './controller/word.controller';
import { AuthGuard } from './guard/auth.guard';
import { ClientGuard } from './guard/client.guard';
import { AiDict } from './model/ai-dict.model';
import { BloomFilterShard } from './model/bloom-filter-shard.model';
import { Dict } from './model/dict.model';
import { SentenceHistory } from './model/sentence-history.model';
import { Sentence } from './model/sentence.model';
import { UserWordsPool } from './model/user-words-pool.model';
import { User } from './model/user.model';
import { WelcomeWords } from './model/welcome-words.model';
import { WordBook } from './model/word-book.model';
import { AddService } from './service/add.service';
import { AlgorithmService } from './service/algorithm.service';
import { AppService } from './service/app.service';
import { AuthService } from './service/auth.service';
import { ConfigService } from './service/config.service';
import { MyWordService } from './service/my-word.service';
import { SentenceService } from './service/sentence.service';
import { TaskService } from './service/task.service';
import { WordService } from './service/word.service';
import { AiRequest } from './tool/ai-request';
import { AlgorithmModule } from './tool/algorithm/algorithm.module';
import { VoiceStore } from './tool/voice-store';
import { VoiceAliRequest } from './tool/voice/voice-ali-request';
import { VoiceMurfRequest } from './tool/voice/voice-murf-request';
import { VoiceSpeaker } from './tool/voice/voice-speaker';
import { DictService } from './service/dict.service';

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
      BloomFilterShard,
      UserWordsPool,
      Dict,
      WelcomeWords,
      SentenceHistory,
      AiDict,
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
    WordController,
  ],
  providers: [
    DictService,
    MyWordService,
    TaskService,
    AlgorithmService,
    AuthService,
    ConfigService,
    SentenceService,
    WordService,
    AppService,
    AddService,
    VoiceMurfRequest,
    VoiceAliRequest,
    AiRequest,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientGuard,
    },
    // BloomFilterService,
    VoiceStore,
    VoiceSpeaker,
  ],
})
export class AppModule {}
