import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AppService } from 'src/service/app.service';
import { Auth } from 'src/decorator/auth.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import {
  WordBookAddDto,
  WordBookDto,
  WordBookRememberDto,
  WordBookSummaryDto,
} from 'src/dto/word-book.dto';
import { Lang } from 'src/enum/lang.enum';
import { WordService } from 'src/service/word.service';

@Controller('word_books')
export class WordBookController {
  constructor(
    private readonly appService: AppService,
    private readonly wordServicei: WordService,
  ) {}

  @Get('summary')
  async getWordBooksSummary(
    @Auth() auth: AuthDto,
  ): Promise<WordBookSummaryDto> {
    return this.appService.getWordBookSummary(auth.userId);
  }

  @Get('today')
  async getWordBooksToday(@Auth() auth: AuthDto): Promise<{ result: number }> {
    const result = await this.appService.getWordBookToday(auth.userId);
    return { result };
  }

  @Get()
  async getWordBooks(@Auth() auth: AuthDto): Promise<WordBookDto[]> {
    // TODO: 分页刷新
    const wordBooks = await this.appService.getWordBooks(auth.userId, 200);
    const words = wordBooks.map((v) => v.word);
    const dicts = await this.wordServicei.getDictsByWords(words);

    return wordBooks.map((item) => {
      const dict = dicts.find((v) => v.word === item.word);

      return <WordBookDto>{
        word: item.word,
        voice: `https://dict.youdao.com/dictvoice?audio=${item.word}`,
        phonetic: dict?.phonetic,
      };
    });
  }

  @Post()
  async postWordBooks(@Body() body: WordBookAddDto, @Auth() auth: AuthDto) {
    await this.appService.addWordBook(auth.userId, body.word, Lang.EN);
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
    );
  }

  @Post('delete')
  async delWordBooks(@Body() body: WordBookAddDto, @Auth() auth: AuthDto) {
    await this.appService.delWordBook(auth.userId, body.word);
  }
}
