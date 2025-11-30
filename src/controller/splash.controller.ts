import { Controller, Get, Param } from '@nestjs/common';
import { Public } from 'src/decorator/public.decorator';
import { Lang } from 'src/enum/lang.enum';
import { AppService } from 'src/service/app.service';

@Controller('splash')
export class SplashController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('random_words')
  async getDict(@Param('lang') lang?: Lang): Promise<string[]> {
    const words = await this.appService.getRandomWelcomeWords(
      lang ?? Lang.ZH_CN,
    );
    return words.split('\n');
  }
}
