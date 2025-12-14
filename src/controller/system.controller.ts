import { Controller, Get } from '@nestjs/common';
import { ClientAllowed } from 'src/decorator/client-allowed.decorator';
import { Public } from 'src/decorator/public.decorator';
import { SystemInfoDto } from 'src/dto/system.dto';
import { AppService } from 'src/service/app.service';

@ClientAllowed('android')
@Controller('system')
export class SystemController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('info')
  async getInfo(): Promise<SystemInfoDto> {
    return this.appService.getSystemInfo();
  }
}
