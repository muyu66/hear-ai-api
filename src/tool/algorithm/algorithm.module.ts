import { Module, Provider } from '@nestjs/common';
import { ALGORITHM, AlgorithmFactory } from './algorithm';
import { FsrsAlgorithmService } from './fsrs.algorithm';
import { ZhuzhuAlgorithmService } from './zhuzhu.algorithm';
import { FsrsStAlgorithmService } from './fsrs-st.algorithm';
import { SM2AlgorithmService } from './sm2.algorithm';

// 提供算法数组给工厂
const AlgorithmFactoryProvider: Provider = {
  provide: ALGORITHM,
  useFactory: (
    fsrs: FsrsAlgorithmService,
    fsrsst: FsrsStAlgorithmService,
    sm2: SM2AlgorithmService,
    zhuzhu: ZhuzhuAlgorithmService,
  ) => [fsrs, fsrsst, sm2, zhuzhu],
  inject: [
    FsrsAlgorithmService,
    FsrsStAlgorithmService,
    SM2AlgorithmService,
    ZhuzhuAlgorithmService,
  ],
};

@Module({
  providers: [
    FsrsAlgorithmService,
    FsrsStAlgorithmService,
    SM2AlgorithmService,
    ZhuzhuAlgorithmService,

    AlgorithmFactoryProvider,
    AlgorithmFactory,
  ],
  exports: [AlgorithmFactory],
})
export class AlgorithmModule {}
