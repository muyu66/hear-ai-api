import { WordsType } from 'src/constant/contant';
import { Lang } from 'src/enum/lang.enum';

export class SentenceDto {
  id!: string;
  words!: string[];
  wordsLang!: Lang;
  translation!: string;
  type!: WordsType;
}
