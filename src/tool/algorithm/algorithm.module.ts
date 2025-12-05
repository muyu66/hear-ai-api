import { Module, Provider } from '@nestjs/common';
import { ALGORITHM, AlgorithmFactory } from './algorithm';
import { SMCAlgorithmService } from './smc.algorithm';
import { ShortTermAlgorithmService } from './short-term.algorithm';
import { SMZAlgorithmService } from './smz.algorithm';

// 提供算法数组给工厂
const AlgorithmFactoryProvider: Provider = {
  provide: ALGORITHM,
  useFactory: (
    smc: SMCAlgorithmService,
    st: ShortTermAlgorithmService,
    smz: SMZAlgorithmService,
  ) => [smc, st, smz],
  inject: [SMCAlgorithmService, SMZAlgorithmService, ShortTermAlgorithmService],
};

@Module({
  providers: [
    SMCAlgorithmService,
    ShortTermAlgorithmService,
    SMZAlgorithmService,

    AlgorithmFactoryProvider,
    AlgorithmFactory,
  ],
  exports: [AlgorithmFactory],
})
export class AlgorithmModule {}
