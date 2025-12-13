import { IsEnum, IsNotEmpty } from 'class-validator';
import { Lang } from 'src/enum/lang.enum';

export class MyWordDto {
  word!: string;
  lang!: Lang;
  phonetic?: string[];
  translation?: string;
  type!: 'source' | 'target';
}

export class AddMyWordDto {
  @IsNotEmpty()
  word!: string;
  @IsNotEmpty()
  @IsEnum(Lang)
  lang!: Lang;
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
