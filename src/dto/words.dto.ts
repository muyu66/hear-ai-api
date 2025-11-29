export class WordsDto {
  id!: number;
  words: string;
  translation: string;
  hiddenWords?: string[]; // 暂时不用
}
