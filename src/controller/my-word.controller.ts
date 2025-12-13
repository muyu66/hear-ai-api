import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import _ from 'lodash';
import { Auth } from 'src/decorator/auth.decorator';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { AuthDto } from 'src/dto/auth.dto';
import {
  AddMyWordDto,
  MyWordDto,
  MyWordSummaryDto,
  RememberWordDto,
} from 'src/dto/my-word.dto';
import { Lang } from 'src/enum/lang.enum';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { AuthService } from 'src/service/auth.service';
import { DictService } from 'src/service/dict.service';
import { MyWordService } from 'src/service/my-word.service';
import { randomAB } from 'src/tool/tool';

@ClientAllowed('android')
@Controller('my/words')
export class MyWordController {
  constructor(
    private readonly myWordService: MyWordService,
    private readonly authService: AuthService,
    private readonly dictService: DictService,
  ) {}

  @Get('summary')
  async getSummary(@Auth() auth: AuthDto): Promise<MyWordSummaryDto> {
    return this.myWordService.getWordBookSummary(auth.userId);
  }

  @Get('now')
  async getNow(@Auth() auth: AuthDto): Promise<{ result: number }> {
    const result = await this.myWordService.getWordBookNow(auth.userId);
    return { result };
  }

  @Get()
  async getWords(
    @Query('offset') offset: number = 0,
    @Auth() auth: AuthDto,
  ): Promise<MyWordDto[]> {
    const user = await this.authService.getUserProfile(auth.userId);

    const wordBooks = await this.myWordService.getWordBooks(
      auth.userId,
      20,
      offset,
    );

    // 按语言分组
    const tasks = _.groupBy(wordBooks, (v) => v.wordLang);

    // 并行查询每组字典
    const dictPromises = Object.entries(tasks).map(async ([langKey, items]) => {
      const lang = langKey as Lang;
      const words = items.map((v) => v.word);
      if (words.length === 0) return [];
      return this.dictService.getDictsByWords(words, user.sourceLang, lang);
    });

    const dictsArray = await Promise.all(dictPromises);

    // 合并所有查询结果
    const dicts = dictsArray.flat();

    // 构建 word -> dict 映射，提高查找效率
    const dictMap = new Map(dicts.map((d) => [d.word, d]));

    return wordBooks.map((item) => {
      const dict = dictMap.get(item.word);
      return {
        word: item.word,
        lang: item.wordLang,
        phonetic: dict?.phonetic ?? [],
        translation: dict?.translation ?? '',
        type: randomAB('source', 'target', user.reverseWordBookRatio),
      } satisfies MyWordDto;
    });
  }

  // result=true 添加成功, =false 已经存在不用添加
  @ClientAllowed('android', 'chrome')
  @Post()
  async add(@Body() body: AddMyWordDto, @Auth() auth: AuthDto) {
    const result = await this.myWordService.add(
      auth.userId,
      body.word,
      body.lang,
      auth.clientType,
    );
    return { result };
  }

  @Get(':word/exist')
  async exist(@Param('word') word: string, @Auth() auth: AuthDto) {
    const exist = await this.myWordService.exist(auth.userId, word);
    return { result: exist };
  }

  @Post(':word/remember')
  async remember(
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

  @Post(':word/bad-feedback')
  async bad(
    @Param('word', new RequiredParamPipe()) word: string,
    @Auth() auth: AuthDto,
  ) {
    await this.myWordService.badWordBook(auth.userId, word);
  }

  @Post(':word/delete')
  async delete(
    @Param('word', new RequiredParamPipe()) word: string,
    @Auth() auth: AuthDto,
  ) {
    await this.myWordService.delete(auth.userId, word);
  }
}
