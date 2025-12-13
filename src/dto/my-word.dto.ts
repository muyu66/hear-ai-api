import { Lang } from 'src/enum/lang.enum';

export class MyWordDto {
  word!: string;
  wordLang!: Lang;
  phonetic?: string[];
  translation?: string;
  type!: 'source' | 'target';
}

export class AddMyWordDto {
  word!: string;
}

export class RememberWordDto {
  hintCount!: number;
  thinkingTime!: number;
}

export class MyWordSummaryDto {
  totalCount!: number;
  tomorrowCount!: number;
  nowCount!: number;
  todayDoneCount!: number;
  stability?: number;
}
