import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import {
  AddMyWordDto,
  MyWordDto,
  RememberWordDto,
  MyWordSummaryDto,
} from 'src/dto/my-word.dto';
import { Lang } from 'src/enum/lang.enum';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { MyWordService } from 'src/service/my-word.service';
import { WordService } from 'src/service/word.service';
import { randomAB } from 'src/tool/tool';

@ClientAllowed('android')
@Controller('my/words')
export class MyWordController {
  constructor(
    private readonly myWordService: MyWordService,
    private readonly authService: AuthService,
    private readonly wordServicei: WordService,
  ) {}

  @Get('summary')
  async getMyWordsSummary(@Auth() auth: AuthDto): Promise<MyWordSummaryDto> {
    return this.myWordService.getWordBookSummary(auth.userId);
  }

  @Get('now')
  async getMyWordsNow(@Auth() auth: AuthDto): Promise<{ result: number }> {
    const result = await this.myWordService.getWordBookNow(auth.userId);
    return { result };
  }

  @Get()
  async getMyWords(
    @Query('offset') offset: number = 0,
    @Auth() auth: AuthDto,
  ): Promise<MyWordDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);

    const wordBooks = await this.myWordService.getWordBooks(
      auth.userId,
      20,
      offset,
    );
    const words = wordBooks.map((v) => v.word);
    const dicts = await this.wordServicei.getDictsByWords(words);

    return wordBooks.map((item) => {
      const dict = dicts.find((v) => v.word === item.word);

      return <MyWordDto>{
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
  async addMyWord(@Body() body: AddMyWordDto, @Auth() auth: AuthDto) {
    const result = await this.myWordService.add(
      auth.userId,
      body.word,
      Lang.EN,
      auth.clientType,
    );
    return { result };
  }

  @Get(':word/exist')
  async existWord(@Param('word') word: string, @Auth() auth: AuthDto) {
    const exist = await this.myWordService.exist(auth.userId, word);
    return { result: exist };
  }

  @Post(':word/remember')
  async rememberWord(
    @Param('word', new RequiredParamPipe()) word: string,
    @Body() body: RememberWordDto,
    @Auth() auth: AuthDto,
  ) {
    await this.myWordService.remember(
      auth.userId,
      word,
      body.hintCount,
      body.thinkingTime,
    );
  }

  @Post(':word/bad')
  async badWord(
    @Param('word', new RequiredParamPipe()) word: string,
    @Auth() auth: AuthDto,
  ) {
    await this.myWordService.badWordBook(auth.userId, word);
  }

  @Post(':word/delete')
  async delWord(
    @Param('word', new RequiredParamPipe()) word: string,
    @Auth() auth: AuthDto,
  ) {
    await this.myWordService.delete(auth.userId, word);
  }
}
