import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlgorithmService } from './algorithm.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly algorithmService: AlgorithmService) {}

  @Cron(CronExpression.EVERY_HOUR, {
    waitForCompletion: true,
  })
  async handleCron() {
    this.logger.debug('异步训练 - 开始个人遗忘曲线训练...');
    await this.algorithmService.train();
    this.logger.debug('异步训练 - 完成个人遗忘曲线训练...');
  }
}
