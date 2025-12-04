import { WordsType } from 'src/constant/contant';

export class SentenceDto {
  id!: number;
  words!: string;
  translation!: string;
  type!: WordsType;
}
