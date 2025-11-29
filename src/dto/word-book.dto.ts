export class WordBookDto {
  word!: string;
  voice!: string;
  phonetic?: string;
}

export class WordBookAddDto {
  word!: string;
}

export class WordBookRememberDto {
  word!: string;
  hintCount!: number;
}

export class WordBookSummaryDto {
  totalCount!: number;
  todayCount!: number;
  tomorrowCount!: number;
}
