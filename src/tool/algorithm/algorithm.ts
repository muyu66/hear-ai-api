import { Inject, Injectable } from '@nestjs/common';
import { RememberModel } from 'src/interface/remember-model';
import { User } from 'src/model/user.model';

export interface IAlgorithm<Grade, Card, Parameters> {
  type: string; // 每个算法类都提供自己的标识

  build(model?: RememberModel): Card;

  buildParams(user: User): Parameters;

  buildGrade(model: RememberModel): Grade;

  resolve(card: Card): Partial<RememberModel>;

  handle(grade: Grade, card: Card, params: Parameters, now?: Date): Card;
}

export const ALGORITHM = 'ALGORITHM';

@Injectable()
export class AlgorithmFactory {
  private algorithmMap = new Map<
    string,
    IAlgorithm<unknown, unknown, unknown>
  >();

  constructor(
    @Inject(ALGORITHM) algorithms: IAlgorithm<unknown, unknown, unknown>[],
  ) {
    algorithms.forEach((algo) => {
      this.algorithmMap.set(algo.type, algo);
    });
  }

  /**
   * 获取指定算法器
   * @param type
   * @returns 找不到则返回默认算法
   */
  getAlgorithm(type: string): IAlgorithm<unknown, unknown, unknown> {
    const algo = this.algorithmMap.get(type);
    if (!algo) return this.algorithmMap.get('sm2')!;
    return algo;
  }

  getAlgorithms(): IAlgorithm<unknown, unknown, unknown>[] {
    const algoes = this.algorithmMap.values();
    return Array.from(algoes);
  }
}
