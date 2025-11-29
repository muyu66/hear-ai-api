import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config.module';
import { AuthController } from './controller/auth.controller';
import { TaskController } from './controller/task.controller';
import { WordBookController } from './controller/word-book.controller';
import { WordController } from './controller/word.controller';
import { WordsController } from './controller/words.controller';
import { AuthGuard } from './guard/auth.guard';
import { BloomFilterShard } from './model/bloom-filter-shard.model';
import { Dict } from './model/dict.model';
import { UserWordsPool } from './model/user-words-pool.model';
import { User } from './model/user.model';
import { WordBook } from './model/word-book.model';
import { Words } from './model/words.model';
import { AddService } from './service/add.service';
import { AppService } from './service/app.service';
import { AuthService } from './service/auth.service';
import { ConfigService } from './service/config.service';
import { WordService } from './service/word.service';
import { WordsService } from './service/words.service';
import { AiRequest } from './tool/ai-request';
import { BloomFilterService } from './tool/bloom-filter';
import { VoiceStore } from './tool/voice-store';
import { VoiceAliRequest } from './tool/voice/voice-ali-request';
import { VoiceMurfRequest } from './tool/voice/voice-murf-request';
import { VoiceSpeaker } from './tool/voice/voice-speaker';

@Module({
  imports: [
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
      Words,
      User,
      WordBook,
      BloomFilterShard,
      UserWordsPool,
      Dict,
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
    WordsController,
    WordController,
    AuthController,
    TaskController,
    WordBookController,
  ],
  providers: [
    AuthService,
    ConfigService,
    WordsService,
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
    BloomFilterService,
    VoiceStore,
    VoiceSpeaker,
  ],
})
export class AppModule {}
