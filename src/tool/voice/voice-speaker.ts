import { Injectable } from '@nestjs/common';
import _ from 'lodash';

@Injectable()
export class VoiceSpeaker {
  public readonly ALI_CALLY = { name: 'ali-cally', id: 'cally' };
  public readonly ALI_ERIC = { name: 'ali-eric', id: 'eric' };
  public readonly ALI_EMILY = { name: 'ali-emily', id: 'emily' };
  public readonly ALI_EVA = { name: 'ali-eva', id: 'eva' };

  // 所有可用名字
  private readonly enabledVoices = [
    this.ALI_CALLY,
    this.ALI_ERIC,
    this.ALI_EMILY,
    this.ALI_EVA,
  ];

  getRandomName(): string {
    const voice = _.sample(this.enabledVoices);
    return voice ? voice.name : this.getDefaultName(); // 默认值，数组空时不报错
  }

  getDefaultName(): string {
    return this.ALI_CALLY.name;
  }
}
