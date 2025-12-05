import { Inject, Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { User } from 'src/model/user.model';

export interface IAlgorithm {
  type: string; // 每个算法类都提供自己的标识

  handle(sourceModel: RememberModel, user: User): Partial<RememberModel>;
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

  /**
   * 获取指定算法器
   * @param type
   * @returns 找不到则返回默认算法
   */
  getAlgorithm(type: string): IAlgorithm {
    const algo = this.algorithmMap.get(type);
    if (!algo) return this.algorithmMap.get('st')!;
    return algo;
  }

  getAlgorithms(): IAlgorithm[] {
    const algoes = this.algorithmMap.values();
    return Array.from(algoes);
  }
}
