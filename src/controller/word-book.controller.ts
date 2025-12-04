import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import {
  WordBookAddDto,
  WordBookDto,
  WordBookRememberDto,
  WordBookSummaryDto,
} from 'src/dto/word-book.dto';
import { Lang } from 'src/enum/lang.enum';
import { AppService } from 'src/service/app.service';
import { AuthService } from 'src/service/auth.service';
import { WordService } from 'src/service/word.service';
import { randomAB } from 'src/tool/tool';

@ClientAllowed('android')
@Controller('word_books')
export class WordBookController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly wordServicei: WordService,
  ) {}

  @Get('summary')
  async getWordBooksSummary(
    @Auth() auth: AuthDto,
  ): Promise<WordBookSummaryDto> {
    return this.appService.getWordBookSummary(auth.userId);
  }

  @Get('now')
  async getWordBooksNow(@Auth() auth: AuthDto): Promise<{ result: number }> {
    const result = await this.appService.getWordBookNow(auth.userId);
    return { result };
  }

  @Get()
  async getWordBooks(
    @Query('offset') offset: number = 0,
    @Auth() auth: AuthDto,
  ): Promise<WordBookDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);

    const wordBooks = await this.appService.getWordBooks(
      auth.userId,
      20,
      offset,
    );
    const words = wordBooks.map((v) => v.word);
    const dicts = await this.wordServicei.getDictsByWords(words);

    return wordBooks.map((item) => {
      const dict = dicts.find((v) => v.word === item.word);

      return <WordBookDto>{
        word: item.word,
        voice: `https://dict.youdao.com/dictvoice?audio=${item.word}`,
        phonetic: dict?.phonetic,
        translation: dict?.translation,
        type: randomAB('source', 'target', user.reverseWordBookRatio),
      };
    });
  }

  // result=true 添加成功, =false 已经存在不用添加
  @ClientAllowed('android', 'chrome')
  @Post()
  async postWordBooks(@Body() body: WordBookAddDto, @Auth() auth: AuthDto) {
    const result = await this.appService.addWordBook(
      auth.userId,
      body.word,
      Lang.EN,
      auth.clientType,
    );
    return { result };
  }

  @Get('exist')
  async existWordBooks(@Query('word') word: string, @Auth() auth: AuthDto) {
    const exist = await this.appService.existWordBook(auth.userId, word);
    return { result: exist };
  }

  @Post('remember')
  async rememberWordBooks(
    @Body() body: WordBookRememberDto,
    @Auth() auth: AuthDto,
  ) {
    await this.appService.rememberWordBook(
      auth.userId,
      body.word,
      body.hintCount,
      body.thinkingTime,
    );
  }

  @Post('delete')
  async delWordBooks(@Body() body: WordBookAddDto, @Auth() auth: AuthDto) {
    await this.appService.delWordBook(auth.userId, body.word);
  }
}
