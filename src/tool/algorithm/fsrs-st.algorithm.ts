import { Injectable } from '@nestjs/common';

import { User } from 'src/model/user.model';
import { FSRSParameters, generatorParameters } from 'ts-fsrs';
import { FsrsAlgorithmService } from './fsrs.algorithm';

@Injectable()
export class FsrsStAlgorithmService extends FsrsAlgorithmService {
  readonly type: string = 'fsrsst';

  buildParams(user: User): FSRSParameters {
    return generatorParameters({
      enable_fuzz: true,
      enable_short_term: true,
      request_retention: user.targetRetention / 100,
    });
  }
}
