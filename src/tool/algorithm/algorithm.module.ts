import { Module, Provider } from '@nestjs/common';
import { ALGORITHM, AlgorithmFactory } from './algorithm';
import { ARSSAlgorithmService } from './arss.algorithm';
import { ASMPlusAlgorithmService } from './asm-plus.algorithm';
import { SM2AlgorithmService } from './sm2.algorithm';
import { ShortTermAlgorithmService } from './short-term.algorithm';

// 提供算法数组给工厂
const AlgorithmFactoryProvider: Provider = {
  provide: ALGORITHM,
  useFactory: (
    sm2: SM2AlgorithmService,
    asmplus: ASMPlusAlgorithmService,
    arss: ARSSAlgorithmService,
    st: ShortTermAlgorithmService,
  ) => [sm2, asmplus, arss, st],
  inject: [
    SM2AlgorithmService,
    ASMPlusAlgorithmService,
    ARSSAlgorithmService,
    ShortTermAlgorithmService,
  ],
};

@Module({
  providers: [
    SM2AlgorithmService,
    ARSSAlgorithmService,
    ASMPlusAlgorithmService,
    ShortTermAlgorithmService,

    AlgorithmFactoryProvider,
    AlgorithmFactory,
  ],
  exports: [AlgorithmFactory],
})
export class AlgorithmModule {}
