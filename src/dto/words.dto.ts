import { WordsType } from 'src/constant/contant';

export class WordsDto {
  id!: number;
  words: string;
  translation: string;
  type: WordsType;
  hiddenWords?: string[]; // 暂时不用
}
