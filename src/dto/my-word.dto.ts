export class MyWordDto {
  word!: string;
  phonetic?: string;
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
