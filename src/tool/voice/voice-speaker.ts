import { Injectable } from '@nestjs/common';
import _ from 'lodash';

@Injectable()
export class VoiceSpeaker {
  public readonly ALI_CALLY = { name: 'ali-cally', id: 'cally' };
  public readonly ALI_ERIC = { name: 'ali-eric', id: 'eric' };
  public readonly ALI_EMILY = { name: 'ali-emily', id: 'emily' };
  public readonly ALI_EVA = { name: 'ali-eva', id: 'eva' };

  // 所有可用音源
  private getEnabledVoices(
    catalog: 'words' | 'word',
  ): { name: string; id: string }[] {
    return catalog === 'words'
      ? [this.ALI_CALLY, this.ALI_ERIC, this.ALI_EMILY, this.ALI_EVA]
      : [this.ALI_EVA];
  }

  getRandomName(catalog: 'words' | 'word'): string {
    const voice = _.sample(this.getEnabledVoices(catalog));
    return voice!.name;
  }

  getDefaultName(catalog: 'words' | 'word'): string {
    return catalog === 'words' ? this.ALI_CALLY.name : this.ALI_EVA.name;
  }
}
