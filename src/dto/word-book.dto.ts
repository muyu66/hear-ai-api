export class WordBookDto {
  word!: string;
  voice!: string;
  phonetic?: string;
  translation?: string;
  type: 'source' | 'target';
}

export class WordBookAddDto {
  word!: string;
}

export class WordBookRememberDto {
  word!: string;
  hintCount!: number;
  thinkingTime!: number;
}

export class WordBookSummaryDto {
  totalCount!: number;
  currStability?: number;
  tomorrowCount!: number;
  nowCount!: number;
  todayDoneCount!: number;
}
