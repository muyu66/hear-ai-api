import { Injectable, Logger } from '@nestjs/common';
import { IAlgorithm } from './algorithm';
import { SMCAlgorithmService } from './smc.algorithm';

/*
SuperMemo Zhuzhu

基于 SuperMemo 18 (SM-18) 的自适应间隔重复变体实现，用于优化长期记忆和复习计划。
其核心思想是尽可能多角度从用户数据出发，为每一位用户量身定制最适合最有效率的黄金记忆曲线。
*/
@Injectable()
export class SMZAlgorithmService
  extends SMCAlgorithmService
  implements IAlgorithm
{
  private readonly logger2 = new Logger(SMZAlgorithmService.name);
  readonly type: string = 'smz';
}
