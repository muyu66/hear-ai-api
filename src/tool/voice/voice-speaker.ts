import { Lang } from 'src/enum/lang.enum';

export const SPEAKER: Record<Lang, { name: string; id: string }[]> = {
  [Lang.EN]: [
    { name: 'ali-cally', id: 'cally' },
    { name: 'ali-emily', id: 'emily' },
    { name: 'ali-eva', id: 'eva' },
  ],
  [Lang.JA]: [{ name: 'ali-tomoka', id: 'tomoka' }],
  [Lang.ZH_CN]: [],
};
