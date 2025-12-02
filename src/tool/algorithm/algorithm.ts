import { Inject, Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';

export interface IAlgorithm {
  type: string; // 每个算法类都提供自己的标识
  supportTrain: boolean; // 是否支持训练

  handle(
    model: RememberModel,
    targetRetention?: number,
    currentStability?: number,
  ): RememberModel | null;

  train(
    history: RememberModel[],
    initialStability: number, // 新词默认 S=1 天
  ): number;
}

export const ALGORITHM = 'ALGORITHM';

@Injectable()
export class AlgorithmFactory {
  private algorithmMap = new Map<string, IAlgorithm>();

  constructor(@Inject(ALGORITHM) algorithms: IAlgorithm[]) {
    algorithms.forEach((algo) => {
      this.algorithmMap.set(algo.type, algo);
    });
  }

  getAlgorithm(type: string): IAlgorithm {
    const algo = this.algorithmMap.get(type);
    if (!algo) throw new Error(`Unknown algorithm type: ${type}`);
    return algo;
  }

  getAlgorithms(): IAlgorithm[] {
    const algoes = this.algorithmMap.values();
    return Array.from(algoes);
  }
}
