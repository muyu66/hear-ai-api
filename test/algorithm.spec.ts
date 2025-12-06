import _ from 'lodash';
import { RememberModel } from '../src/interface/remember-model';
import { User } from '../src/model/user.model';
import { FsrsAlgorithmService } from '../src/tool/algorithm/fsrs.algorithm';
import { AlgorithmFactory, IAlgorithm } from '../src/tool/algorithm/algorithm';
import { FsrsStAlgorithmService } from '../src/tool/algorithm/fsrs-st.algorithm';
import { SM2AlgorithmService } from '../src/tool/algorithm/sm2.algorithm';
import { ZhuzhuAlgorithmService } from '../src/tool/algorithm/zhuzhu.algorithm';

describe('记忆算法验证', () => {
  let service: IAlgorithm<unknown, unknown, unknown>;
  beforeEach(() => {
    const services = new AlgorithmFactory([
      new FsrsAlgorithmService(),
      new FsrsStAlgorithmService(),
      new SM2AlgorithmService(),
      new ZhuzhuAlgorithmService(),
    ]);
    service = services.getAlgorithm('zhuzhu');
  });

  function continuousFunc(
    name: string,
    count: number,
    currHintCount: () => number,
  ) {
    let rememberModel: Partial<RememberModel> | undefined;
    const tableData: object[] = [];
    _.times(count, () => {
      const targetRetention = _.random(80, 95, false);
      const activeLevel = _.random(0, 100, false);
      const dailyPlanUseMinute = _.random(3, 120, false);
      if (rememberModel) {
        rememberModel.currThinkingTime = _.random(0, 10000, false);
      }

      const card = service.build(rememberModel as RememberModel);
      const params = service.buildParams({
        targetRetention,
        activeLevel,
        useMinute: dailyPlanUseMinute,
      } as User);
      const grade = service.buildGrade({
        currHintCount: currHintCount(),
      } as RememberModel);
      const newCard = service.handle(
        grade,
        card,
        params,
        rememberModel?.nextRememberedAt,
      );
      const partialRememberModel = service.resolve(newCard);
      rememberModel = partialRememberModel as RememberModel;
      tableData.push({
        ...rememberModel,
        ...{ grade, targetRetention, activeLevel },
        ...{ useMinute: dailyPlanUseMinute },
      });
    });
    console.log(name);
    console.table(tableData);
  }

  it(`连续全满`, () => {
    continuousFunc('连续全满', 20, () => 0);
  });

  it(`连续全错`, () => {
    continuousFunc('连续全错', 20, () => 3);
  });

  it(`随机分数`, () => {
    continuousFunc('随机分数', 20, () => _.random(0, 3, false));
  });
});
