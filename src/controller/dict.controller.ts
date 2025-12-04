import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DictType } from 'src/constant/contant';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { DictModel } from 'src/interface/dict-model';
import { RequiredParamPipe } from 'src/pipe/required-param.pipe';
import { DictService } from 'src/service/dict.service';

@ClientAllowed('android')
@Controller()
export class DictController {
  constructor(private readonly dictService: DictService) {}

  /**
   * 根据单词，获取词典的内容
   * @param word
   * @returns
   */
  @Get('dicts/:word')
  async getDict(
    @Param('word', new RequiredParamPipe()) word: string,
  ): Promise<{ [key in DictType]?: DictModel }> {
    return this.dictService.getDictsByWord(word);
  }

  /**
   * 给这个词典里的单词打差评
   * @param word
   * @returns
   */
  @Post('dicts/:word/bad-feedback')
  async badDict(
    @Param('word', new RequiredParamPipe()) word: string,
    @Body() body: { dict: DictType },
  ) {
    return this.dictService.badDict(body.dict, word);
  }
}
